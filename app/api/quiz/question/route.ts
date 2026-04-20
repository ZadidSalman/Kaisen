import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'anime', 'title', 'artist'
    const source = searchParams.get('source') || 'random'

    let themePoolFilter: any = { audioUrl: { $ne: null } }

    if (source === 'library') {
      const payload = proxy(req)
      if (!payload) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      const user = await User.findById(payload.userId)
      if (!user || !user.anilist?.accessToken) {
        return NextResponse.json({ success: false, error: 'AniList not connected' }, { status: 400 })
      }

      // Fetch completed media IDs from AniList (reusing logic or getting from DB if we cached them? 
      // For now, let's fetch IDs to be fresh)
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
      const mediaIds = entries.map((e: any) => e.mediaId)

      if (mediaIds.length === 0) {
        return NextResponse.json({ success: false, error: 'Your AniList library is empty' }, { status: 404 })
      }

      themePoolFilter.anilistId = { $in: mediaIds }
    } else {
      themePoolFilter.isPopular = true
    }

    // 1. Get the correct theme
    const [correctTheme] = await ThemeCache.aggregate([
      { $match: themePoolFilter },
      { $sample: { size: 1 } },
    ])

    if (!correctTheme) {
      return NextResponse.json({ success: false, error: 'No themes found' }, { status: 404 })
    }

    // 2. Get 3 distractors
    // We want distractors that are different from the correct one based on the quiz type
    // Distractors can come from the global pool to ensure they are diverse, or from library if available
    let distractorFilter: any = { _id: { $ne: correctTheme._id }, isPopular: true }
    
    // For artist quiz, ensure distractors have an artist name
    if (type === 'artist') {
      distractorFilter.artistName = { $ne: null, $ne: correctTheme.artistName }
    } else if (type === 'title') {
      distractorFilter.songTitle = { $ne: correctTheme.songTitle }
    } else {
      distractorFilter.animeTitle = { $ne: correctTheme.animeTitle }
    }

    const distractors = await ThemeCache.aggregate([
      { $match: distractorFilter },
      { $sample: { size: 3 } },
    ])

    // Shuffle options
    const options = [correctTheme, ...distractors]
      .map(t => {
        if (type === 'anime') return t.animeTitle
        if (type === 'title') return t.songTitle
        if (type === 'artist') return t.artistName || 'Unknown Artists'
        return t.animeTitle
      })
      .sort(() => Math.random() - 0.5)

    // Remove sensitive data from correctTheme before sending to client
    const { embedding, ...safeTheme } = correctTheme

    return NextResponse.json({
      success: true,
      data: {
        questionTheme: safeTheme, // This has the video/audio
        options,
        correctValue: type === 'anime' ? correctTheme.animeTitle : (type === 'title' ? correctTheme.songTitle : correctTheme.artistName)
      }
    })

  } catch (err) {
    console.error('[API] GET /api/quiz/question:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
