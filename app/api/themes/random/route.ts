import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const type   = searchParams.get('type')
    const season = searchParams.get('season')
    const year   = searchParams.get('year')

    const filter: any = { isPopular: true }
    if (type)   filter.type = type.toUpperCase()
    if (season) filter.animeSeason = season.toUpperCase()
    if (year)   filter.animeSeasonYear = parseInt(year)

    // $sample is the correct MongoDB way
    const [theme] = await ThemeCache.aggregate([
      { $match: filter },
      { $sample: { size: 1 } },
      {
        $project: {
          embedding: 0,
          animeGrillImage: 0,
          syncedAt: 0,
          animeTitleAlternative: 0,
          animeStudios: 0,
          animeSeries: 0,
        }
      }
    ])

    if (!theme) {
      return NextResponse.json(
        { success: false, error: 'No themes found matching filters', code: 404 },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: theme })

  } catch (err) {
    console.error('[API] GET /api/themes/random:', err)
    return NextResponse.json(
      { success: false, error: 'Could not get random theme', code: 500 },
      { status: 500 }
    )
  }
}
