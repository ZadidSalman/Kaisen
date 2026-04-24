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
    const user = await User.findOne({ username: username.toLowerCase() }).lean()
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        totalFollowers: user.totalFollowers || 0,
        totalFollowing: user.totalFollowing || 0,
        totalTime: user.totalTime || 0,
        totalRatings: user.totalRatings || 0,
      }
    })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/stats:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
