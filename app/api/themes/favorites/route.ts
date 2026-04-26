import { NextRequest, NextResponse } from 'next/server'
import { Favorite, User, ThemeCache } from '@/lib/models'
import { connectDB } from '@/lib/db'
import { proxy } from '@/proxy'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'OP' or 'ED'

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    }

    const favoriteDocs = await Favorite.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .select('themeId')
      .lean()

    const favoriteThemeIds = favoriteDocs.map((f: any) => f.themeId)

    if (favoriteThemeIds.length === 0) {
      return NextResponse.json({ success: true, data: [], meta: { total: 0, page, limit } })
    }

    const finalQuery: any = { _id: { $in: favoriteThemeIds } }
    if (type) {
      finalQuery.type = type
    }

    const total = await ThemeCache.countDocuments(finalQuery)
    const themes = await ThemeCache.find(finalQuery, {
      embedding: 0,
      animeGrillImage: 0,
      syncedAt: 0,
      animeTitleAlternative: 0,
      animeStudios: 0,
      animeSeries: 0,
    })
    .sort({ animeSeasonYear: -1, animeTitle: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

    return NextResponse.json({
      success: true,
      data: themes,
      meta: {
        total,
        page,
        limit
      }
    })

  } catch (err) {
    console.error('Library favorites API GET error:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { themeId, themeSlug } = await req.json()
    if (!themeId || !themeSlug) {
      return NextResponse.json({ success: false, error: 'themeId and themeSlug are required' }, { status: 400 })
    }

    // Check if already favorited
    const existing = await Favorite.findOne({ userId: payload.userId, themeId })
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already in favorites', data: existing })
    }

    const favorite = await Favorite.create({
      userId: payload.userId,
      themeId,
      themeSlug
    })

    return NextResponse.json({ success: true, data: favorite })
  } catch (err) {
    console.error('Library favorites API POST error:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const themeId = searchParams.get('themeId')

    if (!themeId) {
      return NextResponse.json({ success: false, error: 'themeId is required' }, { status: 400 })
    }

    await Favorite.findOneAndDelete({ userId: payload.userId, themeId })

    return NextResponse.json({ success: true, message: 'Removed from favorites' })
  } catch (err) {
    console.error('Library favorites API DELETE error:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

