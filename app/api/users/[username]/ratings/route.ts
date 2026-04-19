import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Rating } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    await connectDB()
    const { username } = await params
    
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const ratings = await Rating.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('themeId')
      .lean()

    return NextResponse.json({ success: true, data: ratings })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/ratings:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
