import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return handleResponse(false, 'Auth failed or cancelled')
  }

  try {
    await connectDB()
    const refreshTokenCheck = req.cookies.get('refresh_token')?.value
    const payload = refreshTokenCheck ? verifyRefreshToken(refreshTokenCheck) : null

    const host = req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || 'https'
    
    // Must match the URL generation logic exactly
    const baseUrl = host ? `${protocol}://${host}` : (process.env.APP_URL || '')
    const appUrl = baseUrl.replace(/\/$/, '')
    const redirectUri = `${appUrl}/api/auth/anilist/callback`

    const clientId = (process.env.ANILIST_CLIENT_ID || '').trim()
    const clientSecret = (process.env.ANILIST_CLIENT_SECRET || '').trim()

    // Exchange code for token
    const tokenRes = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: parseInt(clientId, 10), // Explicitly cast to integer for AniList
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('[AniList Callback] Token exchange failed:', tokenData)
      const errorMsg = tokenData.error === 'invalid_client' 
        ? 'AniList rejected your Client ID/Secret. Please check your Vercel Environment Variables.'
        : tokenData.message || tokenData.error || 'Failed to exchange token'
      return handleResponse(false, errorMsg)
    }

    // Fetch AniList user info
    const userRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            Viewer {
              id
              name
              avatar {
                large
              }
            }
          }
        `
      }),
    })

    const userData = await userRes.json()
    const viewer = userData.data?.Viewer

    if (!viewer) {
      return handleResponse(false, 'Failed to fetch AniList profile')
    }

    let targetUser: any = null

    if (payload) {
      // LINKING CASE: User is already logged in
      targetUser = await User.findByIdAndUpdate(payload.userId, {
        $set: {
          anilist: {
            accessToken: tokenData.access_token,
            userId: viewer.id,
            username: viewer.name,
            syncedAt: new Date(),
          }
        }
      }, { new: true })
    } else {
      // LOGIN/REGISTER CASE: No existing session
      targetUser = await User.findOne({ 'anilist.userId': viewer.id })

      if (!targetUser) {
        // REGISTRATION: Create new user
        // Generate a unique username based on AniList username
        let username = viewer.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        const existingUser = await User.findOne({ username })
        if (existingUser) {
          username = `${username}${viewer.id}`
        }

        targetUser = await User.create({
          username,
          displayName: viewer.name,
          email: `anilist_${viewer.id}@kaikansen.io`,
          passwordHash: 'OAUTH_USER_NO_PASSWORD',
          avatarUrl: viewer.avatar?.large || null,
          anilist: {
            accessToken: tokenData.access_token,
            userId: viewer.id,
            username: viewer.name,
            syncedAt: new Date(),
          }
        })
      } else {
        // LOGIN: Update existing user's token
        targetUser.anilist.accessToken = tokenData.access_token
        targetUser.anilist.syncedAt = new Date()
        await targetUser.save()
      }
    }

    if (!targetUser) {
      return handleResponse(false, 'Failed to process user session')
    }

    // Prepare response with cookies if logging in
    const response = handleResponse(true, undefined, targetUser)
    
    // Set refresh token cookie
    const refreshToken = signRefreshToken({
      userId: targetUser._id.toString(),
      username: targetUser.username,
      email: targetUser.email,
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (err) {
    console.error('[API] GET /api/auth/anilist/callback:', err)
    return handleResponse(false, 'Internal server error')
  }
}

function handleResponse(success: boolean, message?: string, user?: any) {
  const accessToken = user ? signAccessToken({
    userId: user._id.toString(),
    username: user.username,
    email: user.email,
  }) : null

  const script = success 
    ? `window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', accessToken: '${accessToken}' }, '*'); window.close();`
    : `window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${message}' }, '*'); setTimeout(() => window.close(), 5000);`

  const errorMessage = message === 'Auth failed or cancelled' 
    ? 'Authentication code missing. This page should not be visited directly. Please use the login button in the app.'
    : message;

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${success ? 'Success' : 'Error'}</title>
      </head>
      <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0b0b0b; color: white; margin: 0;">
        <div style="text-align: center; max-width: 400px; padding: 20px;">
          <div style="font-size: 64px; margin-bottom: 24px;">${success ? '≋' : '✕'}</div>
          <h2 style="margin-bottom: 12px; font-size: 24px;">${success ? 'Welcome to Kaikansen!' : 'Authentication Error'}</h2>
          <p style="color: #aaa; line-height: 1.5;">${success ? 'You have successfully signed in. This window will close automatically.' : errorMessage}</p>
          ${!success ? '<p style="margin-top: 20px; font-size: 13px; color: #666;">This window will close in a few seconds...</p>' : ''}
        </div>
        <script>${script}</script>
      </body>
    </html>`,
    {
      headers: { 'Content-Type': 'text/html' }
    }
  )
}
