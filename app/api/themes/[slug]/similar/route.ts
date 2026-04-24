import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB()
    const { slug } = await params
    
    const theme = await ThemeCache.findOne({ slug }).lean()
    if (!theme) return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 })

    // Find themes with same tags or mood, excluding itself
    // We prioritize themes from the same anime or artists if possible, then matching moods
    const similar = await ThemeCache.find({
      $and: [
        { slug: { $ne: slug } },
        {
          $or: [
            { animeTitle: theme.animeTitle },
            { artistName: theme.artistName },
            { mood: { $in: theme.mood } },
            { entries: { $elemMatch: { tags: { $in: theme.entries[0]?.tags || [] } } } }
          ]
        }
      ]
    })
    .sort({ totalRatings: -1, avgRating: -1 })
    .limit(20)
    .lean()

    return NextResponse.json({ success: true, data: similar })
  } catch (err) {
    console.error('[API] GET /api/themes/[slug]/similar:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
