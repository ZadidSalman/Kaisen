import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const season = searchParams.get('season')?.toUpperCase()
    const year = parseInt(searchParams.get('year') ?? '')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20
    const skip = (page - 1) * limit

    if (!season || isNaN(year)) {
      return NextResponse.json({ success: false, error: 'Season and year required' }, { status: 400 })
    }

    const filter: any = {
      animeSeason: season,
      animeSeasonYear: year,
    }
    if (type) {
      filter.type = type.toUpperCase()
    }

    const themes = await ThemeCache.find(filter)
      .sort({ sequence: 1, avgRating: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      data: themes,
      meta: {
        page,
        hasMore: themes.length === limit,
      }
    })
  } catch (err) {
    console.error('[API] GET /api/themes/seasonal:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
