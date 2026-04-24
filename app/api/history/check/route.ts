import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WatchHistory } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: true, watched: false })

    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    
    if (!slug) return NextResponse.json({ success: false, error: 'Slug required' }, { status: 400 })

    const watched = await WatchHistory.exists({ userId: payload.userId, themeSlug: slug })
    
    return NextResponse.json({ success: true, watched: !!watched })
  } catch (err) {
    console.error('[API] GET /api/history/check:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
