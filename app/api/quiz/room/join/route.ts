import { NextRequest, NextResponse } from 'next/server'
import { setTokenCookie } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, User } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'
import { proxy } from '@/proxy'

export async function POST(req: NextRequest) {
  try {
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const { roomCode } = body

    if (!roomCode) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 })
    }

    let room = await QuizRoom.findOne({ roomCode: roomCode.toUpperCase() })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Perform cleanup for disconnected players
    const { cleanupRoom } = await import('@/lib/quiz-room-cleanup')
    room = await cleanupRoom(room)

    if (!room) {
      return NextResponse.json({ error: 'Room has been closed due to inactivity' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Room is no longer waiting for players' }, { status: 400 })
    }

    if (room.players.length >= room.settings.maxPlayers) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    }

    const isAlreadyInRoom = room.players.some((p: any) => p.userId === payload.userId)
    
    if (!isAlreadyInRoom) {
      const user = await User.findById(payload.userId)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

      room.players.push({
        userId: payload.userId,
        username: user.username,
        avatar: user.avatarUrl,
        totalScore: 0,
        ready: false,
        joinedAt: new Date()
      })

      // If room was empty or host left previously, assign this joiner as host
      if (room.players.length === 1) {
        room.hostId = payload.userId
      }

      await room.save()

      await pusherServer.trigger(`presence-quiz-room-${room._id.toString()}`, 'room:player-joined', {
        userId: payload.userId,
        username: user.username,
        avatar: user.avatarUrl,
        playerCount: room.players.length,
        players: room.players
      })
    }

    const response = NextResponse.json({ success: true, roomId: room._id, room })
    
    // Sync token to cookie to ensure the subsequent navigation (which is cookie-only) works
    if (payload._token) {
      setTokenCookie(response, payload._token)
    }

    return response

  } catch (error) {
    console.error('Quiz room join error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
