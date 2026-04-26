import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { pusherServer } from '@/lib/pusher-server'
import dbConnect from '@/lib/db'
import { User } from '@/lib/models'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let socketId: string | null = null
    let channelName: string | null = null

    const contentType = req.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const body = await req.json()
      socketId = body.socket_id
      channelName = body.channel_name
    } else {
      const data = await req.text()
      const params = new URLSearchParams(data)
      socketId = params.get('socket_id')
      channelName = params.get('channel_name')
    }

    if (!socketId || !channelName) {
      console.error('[Pusher Auth] Missing socketId or channelName')
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
    }

    console.log(`[Pusher Auth] Authorizing ${session.user.username} for ${channelName}`)

    // Verify user is only subscribing to their own private channel
    if (channelName.startsWith('private-user-')) {
      const targetUserId = channelName.replace('private-user-', '')
      if (targetUserId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let authResponse;
    if (channelName.startsWith('presence-')) {
      authResponse = pusherServer.authorizeChannel(socketId, channelName, {
        user_id: session.user.id,
        user_info: {
          username: user.username,
          avatar: user.avatarUrl
        }
      })
    } else {
      authResponse = pusherServer.authorizeChannel(socketId, channelName)
    }
    
    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
