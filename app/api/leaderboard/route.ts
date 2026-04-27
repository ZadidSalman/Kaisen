import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { LeaderboardSnapshot, UserRank } from '@/lib/models'

export const dynamic = 'force-dynamic'
const SNAPSHOT_SCOPE = 'global'
const SNAPSHOT_SEASON_ID = 'all-time'
const SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 15

export async function GET(req: NextRequest) {
  try {
    await dbConnect()

    // Fast path: serve a recent snapshot.
    const snapshot = await LeaderboardSnapshot.findOne({
      scope: SNAPSHOT_SCOPE,
      seasonId: SNAPSHOT_SEASON_ID,
    }).lean()
    const now = Date.now()
    const snapshotFresh = snapshot?.computedAt
      ? (now - new Date(snapshot.computedAt).getTime()) <= SNAPSHOT_MAX_AGE_MS
      : false

    if (snapshotFresh && Array.isArray(snapshot?.entries) && snapshot.entries.length > 0) {
      const topPlayers = snapshot.entries.slice(0, 100).map((entry: any) => ({
        userId: entry.userId,
        rp: entry.rp,
        tier: entry.tier,
        division: entry.division,
        username: entry.username,
        displayName: entry.username,
        avatarUrl: entry.avatar ?? null,
        stats: {
          wins: entry.wins,
          winRate: entry.winRate,
        },
      }))

      return NextResponse.json(
        {
          success: true,
          leaderboard: topPlayers,
          meta: {
            source: 'snapshot',
            computedAt: snapshot.computedAt,
          }
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180'
          }
        }
      )
    }

    // Fallback path: live aggregation when no recent snapshot exists.
    const topPlayers = await UserRank.aggregate([
      { $sort: { rp: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          let: { rankUserId: '$userId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toString: '$_id' }, '$$rankUserId']
                }
              }
            }
          ],
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          userId: 1,
          rp: 1,
          tier: 1,
          division: 1,
          stats: 1,
          season: 1,
          username: '$user.username',
          displayName: '$user.displayName',
          avatarUrl: '$user.avatarUrl'
        }
      }
    ])

    return NextResponse.json(
      {
        success: true,
        leaderboard: topPlayers,
        meta: {
          source: 'live',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=180'
        }
      }
    )
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
