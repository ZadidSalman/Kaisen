import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

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
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    const playerIndex = room.players.findIndex((p: any) => p.userId === session.user.id)
    if (playerIndex === -1) {
      return NextResponse.json({ success: true, message: 'Not in room' })
    }

    const leavingPlayer = room.players[playerIndex]
    room.players.splice(playerIndex, 1)

    // If host leaves, pick a new host or close room
    if (room.hostId?.toString() === session.user.id) {
      if (room.players.length > 0) {
        const randomIndex = Math.floor(Math.random() * room.players.length)
        room.hostId = room.players[randomIndex].userId
      } else {
        if (room.status !== 'waiting') {
          room.status = 'ended'
        }
      }
    }

    await room.save()

    // Notify others
    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:player-left', {
      userId: session.user.id,
      username: leavingPlayer.username,
      newHostId: room.hostId,
      roomStatus: room.status
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Room leave error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
