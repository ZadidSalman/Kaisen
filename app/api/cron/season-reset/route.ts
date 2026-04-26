import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { Season, UserRank, LeaderboardSnapshot } from '@/lib/models'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Basic auth check for cron if needed (Vercel provides a CRON_SECRET header)
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Find the active season that should be ending
    const now = new Date()
    const activeSeason = await Season.findOne({ isActive: true, endDate: { $lte: now } })

    if (!activeSeason) {
      return NextResponse.json({ success: true, message: 'No active season needs ending right now' })
    }

    // Snapshot the final leaderboard for this season
    const finalLeaderboard = await UserRank.find().sort({ 'season.seasonRP': -1 }).lean()
    
    await LeaderboardSnapshot.create({
      snapshotType: 'season',
      seasonId: activeSeason._id,
      timestamp: now,
      rankings: finalLeaderboard.map((r, index) => ({
        userId: r.userId,
        rp: r.rp,
        tier: r.tier,
        division: r.division,
        rank: index + 1
      }))
    })

    // Deactivate the old season
    activeSeason.isActive = false
    await activeSeason.save()

    // Reset all users' season stats
    await UserRank.updateMany({}, {
      $set: {
        'season.seasonRP': 0,
        'season.seasonWins': 0,
        'season.seasonLosses': 0
      }
    })

    // Create the next season
    const nextSeasonNumber = activeSeason.seasonNumber + 1
    const nextEndDate = new Date(now)
    nextEndDate.setMonth(nextEndDate.getMonth() + 1) // E.g., seasons last 1 month

    await Season.create({
      seasonNumber: nextSeasonNumber,
      name: `Season ${nextSeasonNumber}`,
      startDate: now,
      endDate: nextEndDate,
      isActive: true,
      rewards: {}
    })

    return NextResponse.json({ success: true, message: `Ended season ${activeSeason.seasonNumber} and started ${nextSeasonNumber}` })
  } catch (error) {
    console.error('Season reset error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
