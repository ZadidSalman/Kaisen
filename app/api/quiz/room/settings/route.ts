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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId, settings } = await req.json()
    if (!roomId || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.hostId && room.hostId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the host can update settings' }, { status: 403 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Cannot update settings after game has started' }, { status: 400 })
    }

    // Update settings
    room.settings = {
      ...room.settings,
      ...settings,
      // Ensure numeric values are correct
      roundCount: Number(settings.roundCount) || room.settings.roundCount,
      timeLimitSeconds: Number(settings.timeLimitSeconds) || room.settings.timeLimitSeconds,
      maxPlayers: Number(settings.maxPlayers) || room.settings.maxPlayers,
    }

    await room.save()

    // Notify all players via Pusher
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:settings-updated', {
      settings: room.settings
    })

    return NextResponse.json({ success: true, settings: room.settings })
  } catch (error) {
    console.error('Update room settings error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
