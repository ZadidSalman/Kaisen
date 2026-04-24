import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { AnimeCache } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const animeId = parseInt(id)
    
    const anime = await AnimeCache.findOne({ anilistId: animeId }).lean()
    if (!anime) return NextResponse.json({ success: false, error: 'Anime not found' }, { status: 404 })

    const seriesNames = anime.series || []
    if (seriesNames.length === 0) return NextResponse.json({ success: true, data: [] })

    // Find other animes in the same series
    const related = await AnimeCache.find({
      $and: [
        { anilistId: { $ne: animeId } },
        { series: { $in: seriesNames } }
      ]
    })
    .sort({ seasonYear: 1 }) // Chronological order
    .limit(10)
    .lean()

    return NextResponse.json({ success: true, data: related })
  } catch (err) {
    console.error('[API] GET /api/anime/[id]/related:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
