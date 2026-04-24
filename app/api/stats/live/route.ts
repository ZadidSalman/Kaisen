import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, WatchHistory } from '@/lib/models'

export async function GET() {
  try {
    await connectDB()

    // Mocking live stats for now
    const activeUsers = await User.countDocuments()
    const listeningNow = Math.floor(Math.random() * 50) + 10

    return NextResponse.json({
      success: true,
      data: {
        activeUsers,
        listeningNow,
        listeningAvatars: [
          'https://picsum.photos/seed/user1/100/100',
          'https://picsum.photos/seed/user2/100/100',
          'https://picsum.photos/seed/user3/100/100',
        ]
      }
    })
  } catch (err) {
    console.error('[API] GET /api/stats/live:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
