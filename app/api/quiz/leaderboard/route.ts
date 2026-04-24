import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { QuizAttempt } from '@/lib/models'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    
    const filter: any = {}
    if (type) filter.quizType = type

    // Get top 10 scores
    const leaderboard = await QuizAttempt.find(filter)
      .sort({ score: -1 })
      .limit(10)
      .populate('userId', 'username displayName avatarUrl')
      .lean()

    return NextResponse.json({ success: true, data: leaderboard })
  } catch (err) {
    console.error('[API] GET /api/quiz/leaderboard:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
