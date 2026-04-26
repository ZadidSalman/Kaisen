import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WatchHistory, ThemeCache } from '@/lib/models'
import { proxy } from '@/proxy'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { themeSlug, atEntryId, mode } = await req.json()
    console.log(`[API] POST /api/history: Creating record for ${themeSlug}, entry ${atEntryId}, mode ${mode}`)
    
    const theme = await ThemeCache.findOne({ slug: themeSlug })
    if (!theme) {
      console.error(`[API] POST /api/history: Theme not found: ${themeSlug}`)
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 })
    }

    const history = await WatchHistory.create({
      userId: payload.userId,
      themeId: theme._id,
      themeSlug,
      atEntryId,
      mode,
    })
    console.log(`[API] POST /api/history: Record created: ${history._id}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] POST /api/history:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const history = await WatchHistory.find({ userId: payload.userId })
      .sort({ viewedAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ success: true, data: history })
  } catch (err) {
    console.error('[API] GET /api/history:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

