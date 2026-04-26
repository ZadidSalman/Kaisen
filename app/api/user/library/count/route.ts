import { NextResponse } from 'next/server'
import { User, ThemeCache, WatchHistory } from '@/lib/models'
import { connectDB } from '@/lib/db'
import { proxy } from '@/proxy'

export async function GET() {
  try {
    // In Next.js 15, we can use headers() and cookies() inside proxy() without passing req
    const payload = await proxy(null as any) 
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Collect local watched theme IDs from WatchHistory
    const localThemeIds = await WatchHistory.find({ userId: payload.userId }).distinct('themeId')

    const anilistMediaIds = user.anilist?.completedMediaIds || []

    const orClauses: any[] = []
    if (localThemeIds.length > 0) orClauses.push({ _id: { $in: localThemeIds } })
    if (anilistMediaIds.length > 0) orClauses.push({ anilistId: { $in: anilistMediaIds } })

    if (orClauses.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const count = await ThemeCache.countDocuments({
      audioUrl: { $ne: null },
      $or: orClauses
    })

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Library count error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
