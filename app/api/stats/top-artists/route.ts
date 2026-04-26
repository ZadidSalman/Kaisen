import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WatchHistory, ThemeCache, ArtistCache } from '@/lib/models'
import { proxy } from '@/proxy'
import mongoose from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = new mongoose.Types.ObjectId(payload.userId)

    // Aggregate watch history to get top themes for this user
    const topThemes = await WatchHistory.aggregate([
      { $match: { userId } },
      { $group: { _id: '$themeId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 } // Get more themes to aggregate into artists
    ])

    if (topThemes.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const themeIds = topThemes.map(t => t._id)
    const themes = await ThemeCache.find({ _id: { $in: themeIds } }, { artistName: 1, artistSlugs: 1 })

    // Map theme counts back to artists
    const artistStats: Record<string, { name: string, plays: number, slug: string }> = {}
    
    topThemes.forEach(t => {
      const theme = themes.find(th => th._id.toString() === t._id.toString())
      if (theme && theme.artistName) {
        if (!artistStats[theme.artistName]) {
          artistStats[theme.artistName] = { 
            name: theme.artistName, 
            plays: 0,
            slug: theme.artistSlugs?.[0] || ''
          }
        }
        artistStats[theme.artistName].plays += t.count
      }
    })

    const sortedArtists = Object.values(artistStats)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 6)

    // Enrich with images
    const artistSlugs = sortedArtists.map(a => a.slug).filter(Boolean)
    const artistCaches = await ArtistCache.find({ slug: { $in: artistSlugs } })

    const data = sortedArtists.map(a => {
      const cache = artistCaches.find(c => c.slug === a.slug)
      return {
        ...a,
        image: cache?.imageUrl || null
      }
    })

    return NextResponse.json({ success: true, data })

  } catch (err) {
    console.error('[API] GET /api/stats/top-artists:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

