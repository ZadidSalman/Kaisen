import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await User.findById(payload.userId)
    if (!user || !user.anilist?.accessToken) {
      return NextResponse.json({ success: false, error: 'AniList not connected' }, { status: 400 })
    }

    let mediaIds = user.anilist.completedMediaIds || []
    const sixHours = 1000 * 60 * 60 * 6
    const isStale = !user.anilist.syncedAt || (new Date().getTime() - new Date(user.anilist.syncedAt).getTime() > sixHours)

    if (mediaIds.length === 0 || isStale) {
      // Fetch completed media IDs from AniList
      const anilistRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.anilist.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query ($userId: Int) {
              MediaListCollection(userId: $userId, type: ANIME, status: COMPLETED) {
                lists {
                  entries {
                    mediaId
                  }
                }
              }
            }
          `,
          variables: { userId: user.anilist.userId }
        }),
      })

      const anilistData = await anilistRes.json()
      const entries = anilistData.data?.MediaListCollection?.lists?.flatMap((list: any) => list.entries) || []
      mediaIds = entries.map((e: any) => e.mediaId)

      if (mediaIds.length > 0) {
        await User.findByIdAndUpdate(user._id, {
          'anilist.completedMediaIds': mediaIds,
          'anilist.syncedAt': new Date()
        })
      }
    }

    if (mediaIds.length === 0) {
      return NextResponse.json({ success: true, data: [], meta: { total: 0 } })
    }

    // Query themes from our DB that match these AniList IDs
    const themes = await ThemeCache.find({
      anilistId: { $in: mediaIds }
    }, {
      embedding: 0,
      animeGrillImage: 0,
      syncedAt: 0,
      animeTitleAlternative: 0,
      animeStudios: 0,
      animeSeries: 0,
    })
    .sort({ animeSeasonYear: -1, animeTitle: 1 })
    .lean()

    return NextResponse.json({
      success: true,
      data: themes,
      meta: {
        total: themes.length,
        anilistUser: user.anilist.username
      }
    })
  } catch (err) {
    console.error('[API] GET /api/themes/library:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
