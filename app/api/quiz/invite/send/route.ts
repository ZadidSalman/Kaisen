import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, QuizInvite, User } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { roomId, toUserId } = await req.json()
    if (!roomId || !toUserId) {
      return NextResponse.json({ error: 'Missing roomId or toUserId' }, { status: 400 })
    }

    const room = await QuizRoom.findById(roomId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Room is no longer waiting for players' }, { status: 400 })
    }

    const sender = await User.findById(session.user.id)
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    const recipient = await User.findById(toUserId)
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const invite = new QuizInvite({
      roomId: room._id.toString(),
      roomCode: room.roomCode,
      roomType: room.roomType,
      fromUserId: sender._id.toString(),
      fromUsername: sender.username,
      fromAvatar: sender.avatarUrl,
      toUserId: recipient._id.toString(),
      status: 'pending'
    })

    await invite.save()

    // Broadcast invite to private channel
    await pusherServer.trigger(`private-user-${toUserId}`, 'quiz-invite', {
      inviteId: invite._id,
      roomCode: room.roomCode,
      roomType: room.roomType,
      fromUsername: sender.username,
      fromAvatar: sender.avatarUrl
    })

    return NextResponse.json({ success: true, inviteId: invite._id })

  } catch (error) {
    console.error('Quiz invite send error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
