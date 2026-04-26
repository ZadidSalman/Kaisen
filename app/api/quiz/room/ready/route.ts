import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, ThemeCache } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { generateRoundOptions, getCorrectAnswer, selectThemeForRoom } from '@/lib/quiz-room-utils'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 })
    }

    const player = room.players.find((p: any) => p.userId === session.user.id)
    if (!player) {
      return NextResponse.json({ error: 'Player not in room' }, { status: 403 })
    }

    player.ready = !player.ready
    await room.save()

    await pusherServer.trigger(`presence-quiz-room-${room._id.toString()}`, 'room:player-ready', {
      userId: session.user.id,
      ready: player.ready,
      players: room.players,
    })

    // Duel auto-start: if both players are ready, start the game automatically
    if (room.roomType === 'duel' && room.players.length === 2) {
      const allReady = room.players.every((p: any) => p.ready)

      if (allReady) {
        let correctTheme = await selectThemeForRoom(room)

        if (!correctTheme) {
          const themes = await ThemeCache.aggregate([
            { $match: { audioUrl: { $ne: null } } },
            { $sample: { size: 1 } }
          ])
          correctTheme = themes[0]
          console.warn('[QuizRoomTheme] Ready route fallback selected unrestricted theme', {
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
          return NextResponse.json({ error: 'No theme available' }, { status: 404 })
        }
        const correctAnswer = getCorrectAnswer(correctTheme, room.settings.guessType)
        const options = await generateRoundOptions(correctTheme, room.settings.guessType)

        const newRound = {
          roundNumber: 1,
          themeId: correctTheme._id.toString(),
          videoUrl: correctTheme.audioUrl,
          correctAnswer,
          alternateAnswers: [correctTheme.animeTitle, correctTheme.animeTitleEnglish, ...(correctTheme.animeTitleAlternative || [])].filter(Boolean),
          options,
          startedAt: new Date(),
          answers: [],
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
        room.timerAuthority = Date.now().toString()

        await room.save()

        await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-started', {
          round: 1,
          theme: {
            videoUrl: newRound.videoUrl,
            options: newRound.options,
          },
          startedAt: newRound.startedAt,
          timeLimitSeconds: room.settings.timeLimitSeconds || 30,
        })

        return NextResponse.json({ success: true, gameStarted: true })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Quiz room ready error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
