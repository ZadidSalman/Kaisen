import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { UserRank } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await dbConnect()

    // Query top 100 players by RP
    // In a production app with a huge player base, you'd use Redis or LeaderboardSnapshot.
    // For now, sorting UserRank directly is fine since MongoDB handles this well with an index on rp.
    const topPlayers = await UserRank.aggregate([
      { $sort: { rp: -1 } },
      { $limit: 100 },
      {
        $addFields: {
          userObjectId: { $toObjectId: "$userId" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
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

    return NextResponse.json({ success: true, leaderboard: topPlayers })
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
