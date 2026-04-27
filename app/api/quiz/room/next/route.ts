import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, ThemeCache } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { generateRoundOptions, getCorrectAnswer, selectThemeForRoom } from '@/lib/quiz-room-utils'

export const dynamic = 'force-dynamic'

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
  const routeTag = 'QuizRoomNext'
  const routeLog = (event: string, extra?: Record<string, unknown>) => {
    console.log(`[${routeTag}] ${event}`, extra ?? {})
  }
  const routeWarn = (event: string, extra?: Record<string, unknown>) => {
    console.warn(`[${routeTag}] ${event}`, extra ?? {})
  }
  try {
    await dbConnect()
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const payload = { userId: session.user.id }

    const { roomId } = await req.json()
    if (!roomId) {
      routeWarn('missing_room_id')
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room) {
      routeWarn('room_not_found', { roomId })
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    if (room.hostId && room.hostId.toString() !== payload.userId) {
      routeWarn('forbidden_non_host_next', { roomId, userId: payload.userId, hostId: room.hostId?.toString?.() })
      return NextResponse.json({ success: false, error: 'Only the host can start the next round' }, { status: 403 })
    }

    if (room.status !== 'in_progress') {
      routeWarn('invalid_room_status', { roomId, status: room.status })
      return NextResponse.json({ success: false, error: 'Room is not in progress' }, { status: 400 })
    }

    if (room.currentRound >= room.settings.roundCount) {
      routeWarn('max_rounds_reached', { roomId, currentRound: room.currentRound, roundCount: room.settings.roundCount })
      return NextResponse.json({ success: false, error: 'Max rounds reached' }, { status: 400 })
    }

    const expectedRound = room.currentRound
    const usedThemeIds = room.usedThemeIds || []
    let correctTheme = await selectThemeForRoom(room, usedThemeIds)

    if (!correctTheme) {
      // Fallback if no themes found
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
      routeWarn('no_theme_available', { roomId, usedThemeCount: usedThemeIds.length })
      return NextResponse.json({ success: false, error: 'No theme available' }, { status: 404 })
    }

    // Determine correct answer based on guess type
    const correctAnswer = getCorrectAnswer(correctTheme, room.settings.guessType)
    const options = await generateRoundOptions(correctTheme, room.settings.guessType)

    const newRound = {
      roundNumber: expectedRound + 1,
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

    const timerAuthority = Date.now().toString()
    const updateResult = await QuizRoom.updateOne(
      { _id: roomId, status: 'in_progress', currentRound: expectedRound },
      {
        $inc: { currentRound: 1 },
        $push: {
          rounds: newRound,
          usedThemeIds: correctTheme._id.toString(),
        },
        $set: { timerAuthority },
      }
    )
    if (!updateResult.modifiedCount) {
      const latestRoom = await QuizRoom.findById(roomId)
      routeWarn('duplicate_next_ignored', {
        roomId,
        expectedRound,
        actualRound: latestRoom?.currentRound,
      })
      return NextResponse.json({
        success: true,
        alreadyAdvanced: true,
        currentRound: latestRoom?.currentRound ?? expectedRound,
      })
    }

    const updatedRoom = await QuizRoom.findById(roomId)
    const persistedRound = updatedRoom?.currentRound ?? newRound.roundNumber
    const mediaCandidates = buildMediaCandidates(correctTheme)
    const proxiedVideoUrl = mediaCandidates[0] || toProxyUrl(newRound.videoUrl)
    routeLog('round_persisted', {
      roomId,
      round: persistedRound,
      roundCount: updatedRoom?.settings?.roundCount ?? room.settings.roundCount,
      timeLimitSeconds: updatedRoom?.settings?.timeLimitSeconds || room.settings.timeLimitSeconds || 30,
      themeId: newRound.themeId,
      sourceVideoUrl: newRound.videoUrl,
      proxiedVideoUrl,
      mediaCandidatesCount: mediaCandidates.length,
      usedThemeCount: updatedRoom?.usedThemeIds?.length ?? usedThemeIds.length + 1,
      timerAuthority,
    })

    // Trigger pusher event
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:round-started', {
      round: persistedRound,
      theme: {
        videoUrl: proxiedVideoUrl,
        mediaCandidates,
        options: newRound.options,
      },
      startedAt: newRound.startedAt,
      timeLimitSeconds: updatedRoom?.settings?.timeLimitSeconds || room.settings.timeLimitSeconds || 30,
    })
    routeLog('round_broadcasted', { roomId, round: persistedRound, event: 'room:round-started', proxiedVideoUrl })

    return NextResponse.json({ success: true, room: updatedRoom ?? room })
  } catch (error) {
    console.error(`[${routeTag}] route_exception`, error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
