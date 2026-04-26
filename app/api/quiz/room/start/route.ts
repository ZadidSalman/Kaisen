import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, ThemeCache } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { generateRoundOptions, getCorrectAnswer, selectThemeForRoom } from '@/lib/quiz-room-utils'

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
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    if (room.hostId && room.hostId.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the host can start the room' }, { status: 403 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ success: false, error: 'Room is already in progress or ended' }, { status: 400 })
    }

    if (room.roomType === 'duel') {
      if (room.players.length !== 2) {
        return NextResponse.json({ success: false, error: 'You need exactly 2 players to start a Duel.' }, { status: 400 })
      }
      
      // Duel: both players must be ready (no host concept)
      const allReady = room.players.every((p: any) => p.ready)
      if (!allReady) {
        return NextResponse.json({ success: false, error: 'Both players must be ready!' }, { status: 400 })
      }
    }

    let correctTheme = await selectThemeForRoom(room)

    if (!correctTheme) {
      // Fallback if no themes found for watched pool
      const themes = await ThemeCache.aggregate([
        { $match: { audioUrl: { $ne: null } } },
        { $sample: { size: 1 } }
      ])
      correctTheme = themes[0]
      console.warn('[QuizRoomTheme] Start route fallback selected unrestricted theme', {
        roomId: roomId,
        themeId: correctTheme?._id?.toString?.() || correctTheme?._id,
        animeId: correctTheme?.anilistId,
        animeTitle: correctTheme?.animeTitleEnglish || correctTheme?.animeTitle,
        themeType: correctTheme?.type,
        themeSequence: correctTheme?.sequence,
        audioUrl: correctTheme?.audioUrl,
      })
    }

    if (!correctTheme) {
      return NextResponse.json({ success: false, error: 'No theme available' }, { status: 404 })
    }

    // Determine correct answer based on guess type
    const correctAnswer = getCorrectAnswer(correctTheme, room.settings.guessType)
    const options = await generateRoundOptions(correctTheme, room.settings.guessType)

    const newRound = {
      roundNumber: 1,
      themeId: correctTheme._id.toString(),
      videoUrl: correctTheme.audioUrl,
      correctAnswer: correctAnswer,
      alternateAnswers: [correctTheme.animeTitle, correctTheme.animeTitleEnglish, ...(correctTheme.animeTitleAlternative || [])].filter(Boolean),
      options: options,
      startedAt: new Date(),
      answers: [],
      // Theme metadata for reveal
      animeTitle: correctTheme.animeTitle,
      animeTitleEnglish: correctTheme.animeTitleEnglish,
      coverImage: correctTheme.animeCoverImage || correctTheme.animeCoverImageSmall,
      malId: correctTheme.anilistId,
      themeType: correctTheme.type,
      themeSequence: correctTheme.sequence,
      songTitle: correctTheme.songTitle,
      artistName: correctTheme.artistName,
    }

    room.status = 'in_progress'
    room.currentRound = 1
    room.rounds.push(newRound)
    room.usedThemeIds.push(correctTheme._id.toString())
    room.timerAuthority = Date.now().toString() // Set a fresh timer authority

    await room.save()

    // Trigger pusher event
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-started', {
      round: 1,
      theme: {
        videoUrl: newRound.videoUrl,
        options: newRound.options,
      },
      startedAt: newRound.startedAt,
      timeLimitSeconds: room.settings.timeLimitSeconds || 30,
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Quiz room start error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
