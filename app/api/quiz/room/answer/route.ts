import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { calculateAndApplyRP } from '@/lib/rank-utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { roomId, submittedAnswer, roundNumber } = await req.json()

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })
    }
    if (typeof roundNumber !== 'number') {
      return NextResponse.json({ success: false, error: 'Missing roundNumber' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room || room.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'Room not in progress' }, { status: 400 })
    }
    if (roundNumber !== room.currentRound) {
      return NextResponse.json(
        {
          success: false,
          error: `round_mismatch: expected ${room.currentRound}, got ${roundNumber}`,
          currentRound: room.currentRound,
        },
        { status: 409 }
      )
    }

    const roundIndex = room.currentRound - 1
    const round = room.rounds[roundIndex]
    if (!round || round.endedAt) {
      return NextResponse.json({ success: false, error: 'Round already ended' }, { status: 400 })
    }

    // Check if player already answered this round
    const alreadyAnswered = round.answers.some((a: any) => a.userId === userId)
    if (alreadyAnswered) {
      return NextResponse.json({ success: false, error: 'Already answered' }, { status: 400 })
    }

    const playerCount = room.players.length
    const answeredCount = round.answers.length
    const timeLimitSeconds = room.settings.timeLimitSeconds || 30

    const isDuel = room.roomType === 'duel'
    // ─── AUTO-LOCKOUT CHECK (BEFORE processing) ───
    // If all-but-one have already answered, this player is the last → auto-lock at 0
    // BUT: In Duel, if the first player was WRONG, this player still has a chance.
    // So we only auto-lock if someone already answered CORRECTLY in Duel mode.
    const hasCorrectAnswer = round.answers.some((a: any) => a.correct)
    const isAutoLocked = answeredCount >= playerCount - 1 && (!isDuel || hasCorrectAnswer)

    if (isAutoLocked) {
      round.answers.push({
        userId,
        submittedAnswer: '',
        correct: false,
        secondsRemaining: 0,
        baseScore: 0,
        bonusScore: 0,
        totalScoreGained: 0,
        autoLocked: true,
      })

      // End the round
      round.endedAt = new Date()
      if (room.currentRound >= room.settings.roundCount) {
        room.status = 'ended'
      }

      await room.save()

      if (room.status === 'ended') {
        await calculateAndApplyRP(roomId)
      }

      // Broadcast auto-lock for this player
      await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:player-answered', {
        round: room.currentRound,
        userId,
        submittedAnswer: '',
        correct: false,
        totalScoreGained: 0,
        autoLocked: true,
        answeredCount: round.answers.length,
        totalPlayers: playerCount,
      })

      // Broadcast round ended
      await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-ended', {
        round: room.currentRound,
        answers: round.answers,
        correctAnswer: round.correctAnswer,
        gameOver: room.status === 'ended',
        players: room.players,
        theme: {
          animeTitle: round.animeTitle,
          animeTitleEnglish: round.animeTitleEnglish,
          coverImage: round.coverImage,
          malId: round.malId,
          themeType: round.themeType,
          themeSequence: round.themeSequence,
          songTitle: round.songTitle,
          artistName: round.artistName,
        },
      })

      return NextResponse.json({ success: true, autoLocked: true, score: 0 })
    }

    // ─── CALCULATE SERVER-SIDE SECONDS REMAINING ───
    const elapsedMs = Date.now() - new Date(round.startedAt).getTime()
    const elapsedSeconds = Math.floor(elapsedMs / 1000)
    const secondsRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds)

    // ─── ANSWER VALIDATION (strict equality — MCQ) ───
    const isCorrect = submittedAnswer === round.correctAnswer

    // ─── SCORING ───
    let baseScore = 0
    let bonusScore = 0

    if (isCorrect) {
      baseScore = secondsRemaining // +secondsRemaining for correct
    } else {
      baseScore = -secondsRemaining // −secondsRemaining for wrong
    }

    // First-answer bonus (Party mode only)
    if (isCorrect && room.roomType === 'party') {
      const hasFirstCorrect = round.firstCorrectUserId != null
      if (!hasFirstCorrect) {
        bonusScore = 10 * playerCount
        round.firstCorrectUserId = userId
      }
    }

    const totalScoreGained = baseScore + bonusScore

    // Record the answer
    round.answers.push({
      userId,
      submittedAnswer,
      correct: isCorrect,
      secondsRemaining,
      baseScore,
      bonusScore,
      totalScoreGained,
      autoLocked: false,
    })

    // Update player's total score
    const player = room.players.find((p: any) => p.userId === userId)
    if (player) {
      player.totalScore += totalScoreGained
    }

    // ─── POST-ANSWER: CHECK IF LAST REMAINING PLAYER SHOULD BE AUTO-LOCKED ───
    const newAnsweredCount = round.answers.length
    // In Duel: Only auto-lock the other player if THIS answer was CORRECT.
    // In Party: Auto-lock the last player regardless to speed things up.
    const shouldAutoLockLast = newAnsweredCount >= playerCount - 1 && newAnsweredCount < playerCount && (!isDuel || isCorrect)

    if (shouldAutoLockLast) {
      // ... existing auto-lock logic ...
      const answeredUserIds = round.answers.map((a: any) => a.userId)
      const lastPlayer = room.players.find((p: any) => !answeredUserIds.includes(p.userId))

      if (lastPlayer) {
        round.answers.push({
          userId: lastPlayer.userId,
          submittedAnswer: '',
          correct: false,
          secondsRemaining: 0,
          baseScore: 0,
          bonusScore: 0,
          totalScoreGained: 0,
          autoLocked: true,
        })

        await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:player-answered', {
          round: room.currentRound,
          userId: lastPlayer.userId,
          submittedAnswer: '',
          correct: false,
          totalScoreGained: 0,
          autoLocked: true,
          answeredCount: round.answers.length,
          totalPlayers: playerCount,
        })
      }

      round.endedAt = new Date()
      if (room.currentRound >= room.settings.roundCount) {
        room.status = 'ended'
      }
    } else if (!round.endedAt && round.answers.length >= playerCount) {
      // All players answered naturally
      round.endedAt = new Date()
      if (room.currentRound >= room.settings.roundCount) {
        room.status = 'ended'
      }
    }

    await room.save()

    if (room.status === 'ended') {
      await calculateAndApplyRP(roomId)
    }

    // Broadcast this player's answer
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:player-answered', {
      round: room.currentRound,
      userId,
      submittedAnswer,
      correct: isCorrect,
      totalScoreGained,
      bonusScore,
      autoLocked: false,
      answeredCount: round.answers.length,
      totalPlayers: playerCount,
    })

    // If round ended (all answered or auto-locked last), broadcast round-ended
    if (round.endedAt) {
      await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-ended', {
        round: room.currentRound,
        answers: round.answers,
        correctAnswer: round.correctAnswer,
        gameOver: room.status === 'ended',
        players: room.players,
        theme: {
          animeTitle: round.animeTitle,
          animeTitleEnglish: round.animeTitleEnglish,
          coverImage: round.coverImage,
          malId: round.malId,
          themeType: round.themeType,
          themeSequence: round.themeSequence,
          songTitle: round.songTitle,
          artistName: round.artistName,
        },
      })
    }

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      baseScore,
      bonusScore,
      totalScoreGained,
      secondsRemaining,
    })
  } catch (error) {
    console.error('Quiz room answer error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
