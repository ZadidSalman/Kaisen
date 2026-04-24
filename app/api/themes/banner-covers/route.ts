import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    // Get 24 random themes that have a cover image
    const themes = await ThemeCache.aggregate([
      { $match: { animeCoverImage: { $ne: null } } },
      { $sample: { size: 24 } },
      {
        $project: {
          animeCoverImage: 1,
          animeTitle: 1,
          slug: 1
        }
      }
    ])

    return NextResponse.json({ success: true, data: themes })

  } catch (err) {
    console.error('[API] GET /api/themes/banner-covers:', err)
    return NextResponse.json(
      { success: false, error: 'Could not get banner covers' },
      { status: 500 }
    )
  }
}
