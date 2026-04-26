import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizInvite } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { inviteId, action } = await req.json()
    if (!inviteId || !['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const invite = await QuizInvite.findById(inviteId)
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.toUserId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    invite.status = action
    await invite.save()

    return NextResponse.json({ success: true, roomCode: invite.roomCode })

  } catch (error) {
    console.error('Quiz invite respond error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
