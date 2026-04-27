import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { LeaderboardSnapshot, UserRank } from '@/lib/models'

export const dynamic = 'force-dynamic'

const SNAPSHOT_SCOPE = 'global'
const SNAPSHOT_SEASON_ID = 'all-time'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

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
          userId: 1,
          username: '$user.username',
          avatar: '$user.avatarUrl',
          tier: 1,
          division: 1,
          rp: 1,
          wins: '$stats.wins',
          winRate: '$stats.winRate',
          currentWinStreak: '$currentWinStreak',
        }
      }
    ])

    const entries = topPlayers.map((player: any, index: number) => ({
      rank: index + 1,
      userId: player.userId,
      username: player.username,
      avatar: player.avatar ?? null,
      tier: player.tier,
      division: player.division ?? null,
      rp: player.rp ?? 0,
      wins: player.wins ?? 0,
      winRate: player.winRate ?? 0,
      currentWinStreak: player.currentWinStreak ?? 0,
    }))

    const computedAt = new Date()
    await LeaderboardSnapshot.updateOne(
      { scope: SNAPSHOT_SCOPE, seasonId: SNAPSHOT_SEASON_ID },
      {
        $set: {
          scope: SNAPSHOT_SCOPE,
          seasonId: SNAPSHOT_SEASON_ID,
          computedAt,
          entries,
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      meta: {
        scope: SNAPSHOT_SCOPE,
        seasonId: SNAPSHOT_SEASON_ID,
        computedAt,
        totalEntries: entries.length,
      }
    })
  } catch (error) {
    console.error('Leaderboard snapshot cron error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
