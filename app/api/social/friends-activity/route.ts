import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Follow, WatchHistory, Rating, ThemeCache } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: true, data: [] })
    }
    const { searchParams } = new URL(req.url)
    const limitParam = parseInt(searchParams.get('limit') ?? '3')
    const fetchLimit = Math.min(limitParam, 50)

    // 1. Get the list of users followed by the current user
    const following = await Follow.find({ followerId: payload.userId }).lean()
    let followedIds = following.map(f => f.followeeId)

    if (followedIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        meta: { isGlobal: false } 
      })
    }

    const queryFilter = { userId: { $in: followedIds } }

    // 2. Fetch recent activity (history and ratings)
    const [history, ratings] = await Promise.all([
      WatchHistory.find(queryFilter)
        .sort({ viewedAt: -1 })
        .limit(fetchLimit)
        .lean(),
      Rating.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),
    ])

    const userIds = [...new Set([
      ...history.map((h: any) => h.userId.toString()),
      ...ratings.map((r: any) => r.userId.toString())
    ])]
    
    const themeIds = [...new Set([
      ...history.map((h: any) => h.themeId.toString()),
      ...ratings.map((r: any) => r.themeId.toString())
    ])]

    const [users, themes] = await Promise.all([
      User.find({ _id: { $in: userIds } }, 'username displayName avatarUrl').lean(),
      ThemeCache.find({ _id: { $in: themeIds } }, 'slug songTitle').lean()
    ])

    const userMap: Record<string, any> = users.reduce((acc: any, u: any) => { acc[u._id.toString()] = u; return acc }, {})
    const themeMap: Record<string, any> = themes.reduce((acc: any, t: any) => { acc[t._id.toString()] = t; return acc }, {})

    // 3. Combine and sort
    const activities = [
      ...history.map((h: any) => {
        const u = userMap[h.userId.toString()]
        const t = themeMap[h.themeId.toString()]
        return {
          id: h._id.toString(),
          user: {
            username: u?.username || 'unknown',
            displayName: u?.displayName || 'Unknown User',
            avatar: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u?.username || 'guest'}`,
          },
          type: 'listening',
          item: {
            title: t?.songTitle || 'Unknown Title',
            slug: t?.slug || h.themeSlug,
          },
          timestamp: h.viewedAt,
        }
      }),
      ...ratings.map((r: any) => {
        const u = userMap[r.userId.toString()]
        const t = themeMap[r.themeId.toString()]
        return {
          id: r._id.toString(),
          user: {
            username: u?.username || 'unknown',
            displayName: u?.displayName || 'Unknown User',
            avatar: u?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u?.username || 'guest'}`,
          },
          type: 'liked',
          item: {
            title: t?.songTitle || 'Unknown Title',
            slug: t?.slug || r.themeSlug,
          },
          timestamp: r.createdAt,
        }
      }),
    ]
    .filter(a => a.user.username !== 'unknown')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, fetchLimit)

    return NextResponse.json({ 
      success: true, 
      data: activities,
      meta: { isGlobal: false } 
    })
  } catch (err) {
    console.error('[API] GET /api/social/friends-activity:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

