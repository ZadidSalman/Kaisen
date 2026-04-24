import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User, WatchHistory } from '@/lib/models'
import { proxy } from '@/proxy'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'anime', 'title', 'artist'
    const source = searchParams.get('source') || 'random'

    let themePoolFilter: any = { audioUrl: { $ne: null } }

    // Ensure the correct theme has the required metadata for the type
    if (type === 'artist') {
      themePoolFilter.artistName = { $nin: [null, '', 'Unknown'] }
    } else if (type === 'title') {
      themePoolFilter.songTitle = { $nin: [null, '', 'Unknown'] }
    }

    if (source === 'library') {
      // 1. Authenticate the request
      const payload = proxy(req)
      if (!payload) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      const user = await User.findById(payload.userId)
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      }

      // 2. Collect local watched theme IDs from WatchHistory
      const watchHistoryDocs = await WatchHistory.find({ userId: payload.userId })
        .distinct('themeId')
      const localThemeIds = watchHistoryDocs // already an array of ObjectIds from .distinct()

      // 3. Collect AniList completed media IDs if connected
      let anilistMediaIds: number[] = []

      if (user.anilist?.accessToken && user.anilist?.userId) {
        let mediaIds = user.anilist.completedMediaIds || []
        const sixHours = 1000 * 60 * 60 * 6
        const isStale =
          !user.anilist.syncedAt ||
          new Date().getTime() - new Date(user.anilist.syncedAt).getTime() > sixHours

        if (mediaIds.length === 0 || isStale) {
          // Fetch from AniList GraphQL
          try {
            const anilistRes = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${user.anilist.accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
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
                variables: { userId: user.anilist.userId },
              }),
            })

            const anilistData = await anilistRes.json()
            const entries =
              anilistData.data?.MediaListCollection?.lists?.flatMap(
                (list: any) => list.entries
              ) || []
            mediaIds = entries.map((e: any) => e.mediaId)

            if (mediaIds.length > 0) {
              await User.findByIdAndUpdate(user._id, {
                'anilist.completedMediaIds': mediaIds,
                'anilist.syncedAt': new Date(),
              })
            }
          } catch (anilistError) {
            console.warn('[Quiz] Failed to fetch from AniList, using cached/local data:', anilistError)
          }
        }

        anilistMediaIds = mediaIds
      }

      // 4. Build the hybrid filter using $or to merge both sources
      const orClauses: any[] = []

      if (localThemeIds.length > 0) {
        orClauses.push({ _id: { $in: localThemeIds } })
      }

      if (anilistMediaIds.length > 0) {
        orClauses.push({ anilistId: { $in: anilistMediaIds } })
      }

      // If no library data at all, return an informative error
      if (orClauses.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Your library is empty. Watch some themes or connect your AniList account!',
          },
          { status: 404 }
        )
      }

      themePoolFilter.$or = orClauses
    } else {
      themePoolFilter.isPopular = true
    }

    // 1. Get the correct theme
    const [correctTheme] = await ThemeCache.aggregate([
      { $match: themePoolFilter },
      { $sample: { size: 1 } },
      {
        $project: {
          embedding: 0,
          animeGrillImage: 0,
          syncedAt: 0,
          animeTitleAlternative: 0,
          animeStudios: 0,
          animeSeries: 0,
        },
      },
    ])

    if (!correctTheme) {
      return NextResponse.json(
        { success: false, error: 'No themes found matching your library' },
        { status: 404 }
      )
    }

    // 2. Get 3 distractors (always from popular pool for variety)
    let distractorFilter: any = { _id: { $ne: correctTheme._id }, isPopular: true }

    const distractorProject: any = {
      _id: 1,
    }

    if (type === 'artist') {
      distractorFilter.artistName = { $nin: [null, '', 'Unknown', correctTheme.artistName] }
      distractorProject.artistName = 1
    } else if (type === 'title') {
      distractorFilter.songTitle = { $nin: [null, '', 'Unknown', correctTheme.songTitle] }
      distractorProject.songTitle = 1
    } else {
      distractorFilter.animeTitle = { $ne: correctTheme.animeTitle }
      distractorProject.animeTitle = 1
      distractorProject.animeTitleEnglish = 1
    }

    const distractors = await ThemeCache.aggregate([
      { $match: distractorFilter },
      { $sample: { size: 3 } },
      { $project: distractorProject },
    ])

    // Shuffle options
    const options = [correctTheme, ...distractors]
      .map(t => {
        if (type === 'anime') {
          return (
            t.animeTitleEnglish ||
            t.animeTitle ||
            (t.animeTitleAlternative && t.animeTitleAlternative.length > 0
              ? t.animeTitleAlternative[0]
              : 'Unknown Anime')
          )
        }
        if (type === 'title') return t.songTitle
        if (type === 'artist') return t.artistName || 'Unknown Artist'
        return t.animeTitle
      })
      .sort(() => Math.random() - 0.5)

    // Remove sensitive data from correctTheme before sending to client
    const { embedding, ...safeTheme } = correctTheme

    const getCorrectValue = () => {
      if (type === 'anime') {
        return (
          correctTheme.animeTitleEnglish ||
          correctTheme.animeTitle ||
          (correctTheme.animeTitleAlternative && correctTheme.animeTitleAlternative.length > 0
            ? correctTheme.animeTitleAlternative[0]
            : 'Unknown Anime')
        )
      }
      if (type === 'title') return correctTheme.songTitle
      if (type === 'artist') return correctTheme.artistName
      return correctTheme.animeTitle
    }

    return NextResponse.json({
      success: true,
      data: {
        questionTheme: safeTheme,
        options,
        correctValue: getCorrectValue(),
      },
    })
  } catch (err) {
    console.error('[API] GET /api/quiz/question:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
