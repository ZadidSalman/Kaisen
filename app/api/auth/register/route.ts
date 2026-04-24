import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { username, displayName, email, password } = await req.json()

    if (!username || !displayName || !email || !password) {
      return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 })
    }

    const existing = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] })
    if (existing) {
      return NextResponse.json({ success: false, error: 'User already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const avatars = [
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky&backgroundColor=b6e3f4',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=c0aede',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Kitty&backgroundColor=ffdfbf',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Sunny&backgroundColor=ffd5dc',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Mochi&backgroundColor=d1d4f9',
    ]
    const avatarUrl = avatars[Math.floor(Math.random() * avatars.length)]

    const user = await User.create({
      username: username.toLowerCase(),
      displayName,
      email: email.toLowerCase(),
      passwordHash,
      avatarUrl
    })

    const payload = { userId: user._id.toString(), username: user.username, email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        totalRatings: user.totalRatings,
        totalFollowers: user.totalFollowers,
        totalFollowing: user.totalFollowing,
      }
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[API] POST /api/auth/register:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
