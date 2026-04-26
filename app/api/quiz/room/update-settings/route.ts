import { NextRequest, NextResponse } from 'next/server'
import { proxy } from '@/proxy'
import dbConnect from '@/lib/db'
import { QuizRoom, WatchHistory, ThemeCache } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

export async function POST(req: NextRequest) {
  try {
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const { roomId, settings } = body

    if (!roomId || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.hostId?.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Only the host can update settings' }, { status: 403 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot update settings after game has started' }, { status: 400 })
    }

    // Handle poolMode change (sync watched list if needed)
    if (settings.poolMode === 'watched') {
      const history = await WatchHistory.find({ userId: payload.userId }).select('themeId')
      if (history.length === 0) {
        return NextResponse.json({ error: 'You have no watched themes in your library!' }, { status: 400 })
      }
      
      const themeIds = history.map(h => h.themeId)
      const themes = await ThemeCache.find({ _id: { $in: themeIds } }).select('anilistId')
      settings.watchedPoolAnimeIds = themes.filter(t => t.anilistId).map(t => String(t.anilistId))
    } else {
      settings.watchedPoolAnimeIds = []
    }

    // Update settings
    room.settings = {
      ...room.settings,
      ...settings
    }

    await room.save()

    // Notify all players in the room
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:settings-updated', {
      settings: room.settings
    })

    return NextResponse.json({ success: true, settings: room.settings })

  } catch (error) {
    console.error('Update room settings error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
