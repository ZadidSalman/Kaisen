import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, WatchHistory } from '@/lib/models'

export async function GET() {
  try {
    await connectDB()

    const activeUsers = await User.countDocuments()
    
    // Get themes watched in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentWatches = await WatchHistory.find({ viewedAt: { $gt: tenMinutesAgo } })
      .distinct('userId')
    
    const listeningNow = recentWatches.length + Math.floor(Math.random() * 5) // Add a small random noise for "live" feel
    
    const recentUsers = await User.find({ 
      _id: { $in: recentWatches },
      avatarUrl: { $ne: null }
    })
    .limit(3)
    .select('avatarUrl')
    .lean()

    const listeningAvatars = recentUsers.length > 0 
      ? recentUsers.map(u => u.avatarUrl)
      : [
          'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
          'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
          'https://api.dicebear.com/7.x/avataaars/svg?seed=Shinji',
        ]

    return NextResponse.json({
      success: true,
      data: {
        activeUsers,
        listeningNow,
        listeningAvatars
      }
    })
  } catch (err) {
    console.error('[API] GET /api/stats/live:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
