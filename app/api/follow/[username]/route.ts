import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Follow } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: true, isFollowing: false })

    const { username } = await params
    const targetUser = await User.findOne({ username: username.toLowerCase() })
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const follow = await Follow.findOne({
      followerId: payload.userId,
      followeeId: targetUser._id,
    })

    return NextResponse.json({ success: true, isFollowing: !!follow })
  } catch (err) {
    console.error('[API] GET /api/follow/[username]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { username } = await params
    const targetUser = await User.findOne({ username: username.toLowerCase() })
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    if (targetUser._id.toString() === payload.userId) {
      return NextResponse.json({ success: false, error: 'Cannot follow yourself' }, { status: 400 })
    }

    await Follow.findOneAndUpdate(
      { followerId: payload.userId, followeeId: targetUser._id },
      { followerId: payload.userId, followeeId: targetUser._id },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] POST /api/follow/[username]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { username } = await params
    const targetUser = await User.findOne({ username: username.toLowerCase() })
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    await Follow.findOneAndDelete({
      followerId: payload.userId,
      followeeId: targetUser._id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] DELETE /api/follow/[username]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
