import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import { cleanupRoom } from '@/lib/quiz-room-cleanup'
import { proxy } from '@/proxy'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await req.json()
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 })
    }

    const now = new Date()
    const heartbeatUpdate = await QuizRoom.updateOne(
      { _id: roomId, 'players.userId': payload.userId },
      { $set: { 'players.$.lastSeenAt': now } }
    )
    if (!heartbeatUpdate.matchedCount) {
      return NextResponse.json({ success: false, error: 'Room closed' }, { status: 404 })
    }

    // Occasionally run cleanup without blocking heartbeat response.
    // This avoids read-after-write DB work on every 15s tick.
    const shouldRunCleanup = Math.random() < 0.1
    if (shouldRunCleanup) {
      void QuizRoom.findById(roomId)
        .then((room) => (room ? cleanupRoom(room) : null))
        .catch(() => {})
    }

    return NextResponse.json({
      success: true,
      heartbeatAccepted: true,
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
