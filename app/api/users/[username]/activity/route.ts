import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Rating, WatchHistory, Follow } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    await connectDB()
    const { username } = await params
    
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    // Fetch mixed activity
    const [ratings, history] = await Promise.all([
      Rating.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).populate('themeId').lean(),
      WatchHistory.find({ userId: user._id }).sort({ viewedAt: -1 }).limit(10).populate('themeId').lean(),
    ])

    // Combine and mark types
    const activity = [
      ...ratings.map((r: any) => ({ ...r, activityType: 'rating', date: r.createdAt })),
      ...history.map((h: any) => ({ ...h, activityType: 'watch', date: h.viewedAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15)

    return NextResponse.json({ success: true, data: activity })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/activity:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
