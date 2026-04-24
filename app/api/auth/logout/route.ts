import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })
  response.cookies.set('refresh_token', '', { maxAge: 0 })
  return response
}
