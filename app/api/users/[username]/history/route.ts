import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User, WatchHistory } from '@/lib/models'
import { proxy } from '@/proxy'
import { mergeWatchHistory, normalizeAniListEntry, normalizeLocalEntry } from '@/lib/history-utils'

const ANILIST_TIMEOUT_MS = 1800

async function fetchAniListHistoryEntries(accessToken: string, userId: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ANILIST_TIMEOUT_MS)
  try {
    const anilistRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
        variables: { userId },
      }),
      signal: controller.signal,
    })

    if (!anilistRes.ok) {
      throw new Error(`AniList request failed with status ${anilistRes.status}`)
    }

    const anilistData = await anilistRes.json()
    const anilistLists = anilistData.data?.MediaListCollection?.lists ?? []
    return anilistLists.flatMap((list: any) =>
      (list.entries ?? []).map(normalizeAniListEntry)
    )
  } finally {
    clearTimeout(timer)
  }
}

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
    const localThemeIds = await WatchHistory.find({ userId: user._id }).distinct('themeId')

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

    const includeRemote = searchParams.get('includeRemote') !== '0'
    if (includeRemote && isOwnProfile && user.anilist?.accessToken && user.anilist?.userId) {
      try {
        remoteEntries = await fetchAniListHistoryEntries(user.anilist.accessToken, user.anilist.userId)
      } catch (error) {
        anilistError = error instanceof Error
          ? (error.name === 'AbortError' ? 'AniList request timed out' : error.message)
          : 'Failed to fetch AniList history'
      }
    }

    const mergedHistory = mergeWatchHistory(localEntries, remoteEntries)
    const remoteMediaIds = remoteEntries.map((entry) => Number(entry.id)).filter((id) => Number.isFinite(id))
    const fallbackMediaIds = user.anilist?.completedMediaIds || []
    const mediaIdsForLibraryCount = remoteMediaIds.length > 0 ? remoteMediaIds : fallbackMediaIds

    const libraryOrClauses: any[] = []
    if (localThemeIds.length > 0) {
      libraryOrClauses.push({ _id: { $in: localThemeIds } })
    }
    if (mediaIdsForLibraryCount.length > 0) {
      libraryOrClauses.push({ anilistId: { $in: mediaIdsForLibraryCount } })
    }

    const libraryTotal = libraryOrClauses.length > 0
      ? await ThemeCache.countDocuments({
          audioUrl: { $ne: null },
          $or: libraryOrClauses,
        })
      : 0

    return NextResponse.json({
      success: true,
      data: mergedHistory,
      meta: {
        total: mergedHistory.length,
        libraryTotal,
        localCount: localEntries.length,
        remoteCount: remoteEntries.length,
        merged: true,
        anilistConnected: Boolean(user.anilist?.userId),
        anilistIncluded: includeRemote && isOwnProfile && Boolean(user.anilist?.accessToken),
        anilistError,
      },
    })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/history:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
