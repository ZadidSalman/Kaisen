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
    const payload = { userId: session.user.id }

    const { roomId } = await req.json()
    if (!roomId) return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })

    const room = await QuizRoom.findById(roomId)
    if (!room || room.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'Invalid room or not in progress' }, { status: 400 })
    }

    if (room.hostId && room.hostId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the host can end the timer' }, { status: 403 })
    }

    const roundIndex = room.currentRound - 1
    const round = room.rounds[roundIndex]
    
    if (round.endedAt) {
      return NextResponse.json({ success: true, message: 'Round already ended' })
    }

    // Timer ended, everyone who didn't answer gets 0
    const answeredUserIds = round.answers.map((a: any) => a.userId)
    const unansweredPlayers = room.players.filter((p: any) => !answeredUserIds.includes(p.userId))

    for (const player of unansweredPlayers) {
      round.answers.push({
        userId: player.userId,
        submittedAnswer: '',
        correct: false,
        secondsRemaining: 0,
        baseScore: 0,
        bonusScore: 0,
        totalScoreGained: 0,
        autoLocked: true
      })
    }

    round.endedAt = new Date()
    if (room.currentRound >= room.settings.roundCount) {
      room.status = 'ended'
    }

    await room.save()

    if (room.status === 'ended') {
      await calculateAndApplyRP(roomId)
    }

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
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quiz timer-end error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
