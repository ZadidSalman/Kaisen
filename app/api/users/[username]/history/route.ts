import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, WatchHistory } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    await connectDB()
    const { username } = await params
    
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const history = await WatchHistory.find({ userId: user._id })
      .sort({ viewedAt: -1 })
      .limit(50)
      .populate('themeId')
      .lean()

    return NextResponse.json({ success: true, data: history })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/history:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
