import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Playlist, ThemeCache } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    
    // We can allow public playlists to be seen by anyone if we want, 
    // but for private ones we need auth.
    const playlist = await Playlist.findById(id).populate({
      path: 'themes',
      select: '-embedding -animeGrillImage'
    }).lean()

    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: playlist })
  } catch (err) {
    console.error('[API] GET /api/playlists/[id]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const playlist = await Playlist.findOne({ _id: id, userId: payload.userId })
    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found or access denied' }, { status: 404 })
    }

    const { action, themeId } = await req.json()

    if (action === 'add') {
      if (playlist.themes.includes(themeId)) {
        return NextResponse.json({ success: true, data: playlist, message: 'Theme already in playlist' })
      }
      playlist.themes.push(themeId)
    } else if (action === 'remove') {
      playlist.themes = playlist.themes.filter((tid: any) => tid.toString() !== themeId)
    } else {
       // Update metadata
       const { name, description, isPublic } = await req.json()
       if (name !== undefined) playlist.name = name
       if (description !== undefined) playlist.description = description
       if (isPublic !== undefined) playlist.isPublic = isPublic
    }

    await playlist.save()
    return NextResponse.json({ success: true, data: playlist })
  } catch (err) {
    console.error('[API] PATCH /api/playlists/[id]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const result = await Playlist.deleteOne({ _id: id, userId: payload.userId })
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Playlist not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] DELETE /api/playlists/[id]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
