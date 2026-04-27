import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, ThemeCache } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { generateRoundOptions, getCorrectAnswer, selectThemeForRoom } from '@/lib/quiz-room-utils'

const toProxyUrl = (sourceUrl: string | null | undefined) =>
  sourceUrl ? `/api/media/proxy?url=${encodeURIComponent(sourceUrl)}` : ''

const buildMediaCandidates = (theme: any): string[] => {
  const directCandidates = [
    theme?.videoUrl,
    theme?.audioUrl,
    ...(Array.isArray(theme?.entries)
      ? theme.entries.flatMap((entry: any) =>
          Array.isArray(entry?.videoSources) ? entry.videoSources.map((source: any) => source?.url) : []
        )
      : []),
  ].filter((url): url is string => typeof url === 'string' && url.length > 0)

  const seen = new Set<string>()
  const proxiedCandidates: string[] = []
  for (const directUrl of directCandidates) {
    const proxied = toProxyUrl(directUrl)
    if (!proxied || seen.has(proxied)) continue
    seen.add(proxied)
    proxiedCandidates.push(proxied)
  }

  return proxiedCandidates
}

export async function POST(req: NextRequest) {
  const routeTag = 'QuizRoomReady'
  const routeLog = (event: string, extra?: Record<string, unknown>) => {
    console.log(`[${routeTag}] ${event}`, extra ?? {})
  }
  const routeWarn = (event: string, extra?: Record<string, unknown>) => {
    console.warn(`[${routeTag}] ${event}`, extra ?? {})
  }
  try {
    const session = await getSession()
    if (!session || !session.user) {
      routeWarn('unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const { roomId } = body

    if (!roomId) {
      routeWarn('missing_room_id')
      return NextResponse.json({ error: 'Missing room id' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)

    if (!room) {
      routeWarn('room_not_found', { roomId })
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      routeWarn('invalid_room_status', { roomId, status: room.status })
      return NextResponse.json({ error: 'Game already started' }, { status: 400 })
    }

    const player = room.players.find((p: any) => p.userId === session.user.id)
    if (!player) {
      routeWarn('player_not_in_room', { roomId, userId: session.user.id })
      return NextResponse.json({ error: 'Player not in room' }, { status: 403 })
    }

    player.ready = !player.ready
    await room.save()
    routeLog('player_ready_toggled', { roomId, userId: session.user.id, ready: player.ready })

    await pusherServer.trigger(`presence-quiz-room-${room._id.toString()}`, 'room:player-ready', {
      userId: session.user.id,
      ready: player.ready,
      players: room.players,
    })

    // Duel auto-start: if both players are ready, start the game automatically
    if (room.roomType === 'duel' && room.players.length === 2) {
      const allReady = room.players.every((p: any) => p.ready)
      routeLog('duel_ready_check', { roomId, allReady })

      if (allReady) {
        let correctTheme = await selectThemeForRoom(room)

        if (!correctTheme) {
          const themes = await ThemeCache.aggregate([
            { $match: { audioUrl: { $ne: null } } },
            { $sample: { size: 1 } }
          ])
          correctTheme = themes[0]
          routeWarn('fallback_theme_selected_unrestricted', {
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
          routeWarn('no_theme_available', { roomId })
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
        const mediaCandidates = buildMediaCandidates(correctTheme)
        const proxiedVideoUrl = mediaCandidates[0] || toProxyUrl(newRound.videoUrl)
        routeLog('round_persisted', {
          roomId,
          round: 1,
          roundCount: room.settings.roundCount,
          timeLimitSeconds: room.settings.timeLimitSeconds || 30,
          themeId: newRound.themeId,
          sourceVideoUrl: newRound.videoUrl,
          proxiedVideoUrl,
          mediaCandidatesCount: mediaCandidates.length,
          timerAuthority: room.timerAuthority,
        })

        await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-started', {
          round: 1,
          theme: {
            videoUrl: proxiedVideoUrl,
            mediaCandidates,
            options: newRound.options,
          },
          startedAt: newRound.startedAt,
          timeLimitSeconds: room.settings.timeLimitSeconds || 30,
        })
        routeLog('round_broadcasted', { roomId, round: 1, event: 'room:round-started', proxiedVideoUrl })

        return NextResponse.json({ success: true, gameStarted: true })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(`[${routeTag}] route_exception`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
