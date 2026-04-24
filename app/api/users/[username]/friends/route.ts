import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User, Follow } from '@/lib/models'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    await connectDB()
    const { username } = await params
    
    const user = await User.findOne({ username: username.toLowerCase() })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const [followers, following] = await Promise.all([
      Follow.find({ followeeId: user._id }).populate('followerId', 'username displayName avatarUrl bio').lean(),
      Follow.find({ followerId: user._id }).populate('followeeId', 'username displayName avatarUrl bio').lean(),
    ])

    return NextResponse.json({ 
      success: true, 
      data: {
        followers: followers.map((f: any) => f.followerId),
        following: following.map((f: any) => f.followeeId),
      } 
    })
  } catch (err) {
    console.error('[API] GET /api/users/[username]/friends:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
