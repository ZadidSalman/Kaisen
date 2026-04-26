import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import { cleanupRoom } from '@/lib/quiz-room-cleanup'

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

    let room = await QuizRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    // 1. Update current player's heartbeat
    const player = room.players.find((p: any) => p.userId === session.user.id)
    if (player) {
      player.lastSeenAt = new Date()
      await room.save()
    }

    // 2. Perform background cleanup
    room = await cleanupRoom(room)

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room closed due to inactivity' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      playerCount: room.players.length,
      hostId: room.hostId
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
