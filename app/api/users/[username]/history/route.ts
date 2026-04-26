import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, WatchHistory } from '@/lib/models'
import { proxy } from '@/proxy'
import { mergeWatchHistory, normalizeAniListEntry, normalizeLocalEntry } from '@/lib/history-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    await connectDB()
    const { username } = await params
    const { searchParams } = new URL(req.url)
    const includeMerged = searchParams.get('includeMerged') === '1'
    
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const history = await WatchHistory.find({ userId: user._id })
      .sort({ viewedAt: -1 })
      .limit(50)
      .populate('themeId')
      .lean()

    if (!includeMerged) {
      return NextResponse.json({
        success: true,
        data: history,
        meta: {
          total: history.length,
          localCount: history.length,
          remoteCount: 0,
          merged: false,
        },
      })
    }

    const localEntries = history
      .filter((entry: any) => entry?.themeId)
      .map(normalizeLocalEntry)

    let remoteEntries: ReturnType<typeof normalizeAniListEntry>[] = []
    let anilistError: string | null = null

    const payload = await proxy(req)
    const isOwnProfile = payload?.userId === String(user._id)

    if (isOwnProfile && user.anilist?.accessToken && user.anilist?.userId) {
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
                      updatedAt
                      media {
                        id
                        title {
                          romaji
                          english
                        }
                        coverImage {
                          large
                        }
                        episodes
                      }
                    }
                  }
                }
              }
            `,
            variables: { userId: user.anilist.userId },
          }),
          cache: 'no-store',
        })

        if (!anilistRes.ok) {
          throw new Error(`AniList request failed with status ${anilistRes.status}`)
        }

        const anilistData = await anilistRes.json()
        const anilistLists = anilistData.data?.MediaListCollection?.lists ?? []
        remoteEntries = anilistLists.flatMap((list: any) =>
          (list.entries ?? []).map(normalizeAniListEntry)
        )
      } catch (error) {
        anilistError = error instanceof Error ? error.message : 'Failed to fetch AniList history'
      }
    }

    const mergedHistory = mergeWatchHistory(localEntries, remoteEntries)

    return NextResponse.json({
      success: true,
      data: mergedHistory,
      meta: {
        total: mergedHistory.length,
        localCount: localEntries.length,
        remoteCount: remoteEntries.length,
        merged: true,
        anilistConnected: Boolean(user.anilist?.userId),
        anilistIncluded: isOwnProfile && Boolean(user.anilist?.accessToken),
        anilistError,
      },
    })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/history:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
