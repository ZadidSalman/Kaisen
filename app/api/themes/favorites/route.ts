import { NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { Favorite, User, ThemeCache } from '@/lib/models'
import { connectDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(req: Request) {
  try {
    await connectDB()
    
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verify(token, JWT_SECRET) as any
    if (!payload || !payload.userId) {
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
    console.error('Library favorites API error:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
