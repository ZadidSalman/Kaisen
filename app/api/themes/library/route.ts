import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User, WatchHistory } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'OP' or 'ED'

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    }

    // 1. Get watched themes from DB
    const watchHistory = await WatchHistory.find({ userId: user._id }).select('themeId').lean()
    const watchedThemeIds = watchHistory.map((wh: any) => wh.themeId)

    let anilistMediaIds: number[] = []

    // 2. Get AniList completed media IDs if connected
    if (user.anilist?.accessToken) {
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

        if (anilistRes.ok) {
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
      }
      anilistMediaIds = mediaIds
    }

    if (watchedThemeIds.length === 0 && anilistMediaIds.length === 0) {
      return NextResponse.json({ success: true, data: [], meta: { total: 0, page, limit } })
    }

    // 3. Query themes from our DB that match either the watched ThemeCache _ids or AniList IDs
    const queryConditions: any[] = []
    
    if (watchedThemeIds.length > 0) {
      queryConditions.push({ _id: { $in: watchedThemeIds } })
    }
    
    if (anilistMediaIds.length > 0) {
      queryConditions.push({ anilistId: { $in: anilistMediaIds } })
    }

    const finalQuery: any = { $or: queryConditions }
    if (type) {
      finalQuery.type = type
    }

    const total = await ThemeCache.countDocuments(finalQuery)
    const themes = await ThemeCache.find(finalQuery, {
      embedding: 0,
      animeGrillImage: 0,
      syncedAt: 0,
      animeTitleAlternative: 0,
      animeStudios: 0,
      animeSeries: 0,
    })
    .sort({ animeSeasonYear: -1, animeTitle: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

    return NextResponse.json({
      success: true,
      data: themes,
      meta: {
        total,
        page,
        limit,
        anilistUser: user.anilist?.username || null
      }
    })
  } catch (err) {
    console.error('[API] GET /api/themes/library:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

