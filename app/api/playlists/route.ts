import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Playlist } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const playlists = await Playlist.find({ userId: payload.userId })
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({ success: true, data: playlists })
  } catch (err) {
    console.error('[API] GET /api/playlists:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { name, description, isPublic } = await req.json()
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })

    const playlist = await Playlist.create({
      userId: payload.userId,
      name,
      description: description || '',
      isPublic: isPublic !== undefined ? isPublic : true,
      themes: []
    })

    return NextResponse.json({ success: true, data: playlist })
  } catch (err) {
    console.error('[API] POST /api/playlists:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
