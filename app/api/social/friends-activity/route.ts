import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Follow, WatchHistory, Rating } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) {
      return NextResponse.json({ success: true, data: [] })
    }

    // 1. Get the list of users followed by the current user
    const following = await Follow.find({ followerId: payload.userId }).lean()
    let followedIds = following.map(f => f.followeeId)

    // FALLBACK: If not following anyone, show global activity (excluding self)
    const isGlobalFallback = followedIds.length === 0
    const queryFilter = isGlobalFallback 
      ? { userId: { $ne: payload.userId } } 
      : { userId: { $in: followedIds } }

    // 2. Fetch recent activity (history and ratings)
    const [history, ratings] = await Promise.all([
      WatchHistory.find(queryFilter)
        .sort({ viewedAt: -1 })
        .limit(10)
        .populate('userId', 'username displayName avatarUrl')
        .populate('themeId', 'slug songTitle')
        .lean(),
      Rating.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'username displayName avatarUrl')
        .populate('themeId', 'slug songTitle')
        .lean(),
    ])

    // 3. Combine and sort
    const activities = [
      ...history.map((h: any) => ({
        id: h._id.toString(),
        user: {
          username: h.userId?.username || 'unknown',
          displayName: h.userId?.displayName || 'Unknown User',
          avatar: h.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${h.userId?.username || 'guest'}`,
        },
        type: 'listening',
        item: {
          title: h.themeId?.songTitle || 'Unknown Title',
          slug: h.themeId?.slug || h.themeSlug,
        },
        timestamp: h.viewedAt,
      })),
      ...ratings.map((r: any) => ({
        id: r._id.toString(),
        user: {
          username: r.userId?.username || 'unknown',
          displayName: r.userId?.displayName || 'Unknown User',
          avatar: r.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userId?.username || 'guest'}`,
        },
        type: 'liked',
        item: {
          title: r.themeId?.songTitle || 'Unknown Title',
          slug: r.themeId?.slug || r.themeSlug,
        },
        timestamp: r.createdAt,
      })),
    ]
    .filter(a => a.user.username !== 'unknown')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3) // Show only 3 latest as requested

    return NextResponse.json({ 
      success: true, 
      data: activities,
      meta: { isGlobal: isGlobalFallback } 
    })
  } catch (err) {
    console.error('[API] GET /api/social/friends-activity:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
