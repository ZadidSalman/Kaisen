import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, signAccessToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 })
    }

    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid refresh token' }, { status: 401 })
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      username: payload.username,
      email: payload.email
    })

    return NextResponse.json({ success: true, accessToken })
  } catch (err) {
    console.error('[API] POST /api/auth/refresh:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
