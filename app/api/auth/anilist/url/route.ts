import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const clientId = (process.env.ANILIST_CLIENT_ID || '').trim()
    const clientSecret = (process.env.ANILIST_CLIENT_SECRET || '').trim()

    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        success: false, 
        error: `Configuration Error: ${!clientId ? 'ANILIST_CLIENT_ID' : 'ANILIST_CLIENT_SECRET'} is missing in Vercel. Have you redeployed?` 
      }, { status: 500 })
    }

    const redirectUri = process.env.ANILIST_REDIRECT_URI
    if (!redirectUri) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configuration Error: ANILIST_REDIRECT_URI is missing.' 
      }, { status: 500 })
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
    })

    const authUrl = `https://anilist.co/api/v2/oauth/authorize?${params.toString()}`

    return NextResponse.json({ success: true, url: authUrl })
  } catch (err) {
    console.error('[API] GET /api/auth/anilist/url:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
