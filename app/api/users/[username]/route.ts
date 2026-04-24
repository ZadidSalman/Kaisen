import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    await connectDB()
    const { username } = await params

    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        totalRatings: user.totalRatings,
        totalFollowers: user.totalFollowers,
        totalFollowing: user.totalFollowing,
        createdAt: user.createdAt,
      }
    })
  } catch (err) {
    console.error('[API] GET /api/users/[username]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
