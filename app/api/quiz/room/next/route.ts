import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, ThemeCache, User, WatchHistory } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { generateRoundOptions, getCorrectAnswer, getDynamicThemeFilter } from '@/lib/quiz-room-utils'

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
      return NextResponse.json({ success: false, error: 'Only the host can start the next round' }, { status: 403 })
    }

    if (room.status !== 'in_progress') {
      return NextResponse.json({ success: false, error: 'Room is not in progress' }, { status: 400 })
    }

    if (room.currentRound >= room.settings.roundCount) {
      return NextResponse.json({ success: false, error: 'Max rounds reached' }, { status: 400 })
    }

    // Determine filter for themes using dynamic utility
    const themeFilter = await getDynamicThemeFilter(room)
    themeFilter._id = { $nin: room.usedThemeIds } // Don't repeat themes in the same room

    // We need 1 random theme
    let themes = await ThemeCache.aggregate([
      { $match: themeFilter },
      { $sample: { size: 1 } }
    ])

    if (themes.length === 0) {
      // Fallback if no themes found
      themes = await ThemeCache.aggregate([
        { $match: { audioUrl: { $ne: null } } },
        { $sample: { size: 1 } }
      ])
    }

    const correctTheme = themes[0]

    // Determine correct answer based on guess type
    const correctAnswer = getCorrectAnswer(correctTheme, room.settings.guessType)
    const options = await generateRoundOptions(correctTheme, room.settings.guessType)

    const newRound = {
      roundNumber: room.currentRound + 1,
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

    room.currentRound += 1
    room.rounds.push(newRound)
    room.usedThemeIds.push(correctTheme._id.toString())
    room.timerAuthority = Date.now().toString()

    await room.save()

    // Trigger pusher event
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-started', {
      round: room.currentRound,
      theme: {
        videoUrl: newRound.videoUrl,
        options: newRound.options,
      },
      startedAt: newRound.startedAt,
      timeLimitSeconds: room.settings.timeLimitSeconds || 30,
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Quiz room next round error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
