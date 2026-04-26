import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await req.json()
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room || room.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'Room not in progress' }, { status: 400 })
    }

    // Only host can trigger timeout to prevent abuse
    if (room.hostId.toString() !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Only host can trigger timeout' }, { status: 403 })
    }

    const roundIndex = room.currentRound - 1
    const round = room.rounds[roundIndex]
    
    if (!round || round.endedAt) {
      return NextResponse.json({ success: false, error: 'Round already ended' }, { status: 200 })
    }

    // Identify players who haven't answered
    const answeredUserIds = round.answers.map((a: any) => a.userId.toString())
    const timedOutPlayers = room.players.filter((p: any) => !answeredUserIds.includes(p.userId.toString()))

    // Add empty/failed answers for timed out players
    for (const player of timedOutPlayers) {
      round.answers.push({
        userId: player.userId,
        submittedAnswer: '',
        correct: false,
        secondsRemaining: 0,
        baseScore: 0,
        bonusScore: 0,
        totalScoreGained: 0,
        timedOut: true
      })
    }

    round.endedAt = new Date()
    if (room.currentRound >= room.settings.roundCount) {
      room.status = 'ended'
    }

    await room.save()

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quiz room timeout error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
