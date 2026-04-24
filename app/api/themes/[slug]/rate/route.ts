import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Rating, ThemeCache } from '@/lib/models'
import { proxy } from '@/proxy'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB()
    const { slug } = await params
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { score, mode } = await req.json()
    
    if (score < 1 || score > 10) {
      return NextResponse.json({ success: false, error: 'Invalid score' }, { status: 400 })
    }

    const theme = await ThemeCache.findOne({ slug })
    if (!theme) return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 })

    // Use save() instead of findOneAndUpdate to trigger Mongoose hooks
    let rating = await Rating.findOne({ userId: payload.userId, themeId: theme._id })
    
    if (rating) {
      rating.score = score
      rating.mode = mode
      await rating.save()
    } else {
      rating = await Rating.create({
        userId: payload.userId,
        themeId: theme._id,
        themeSlug: slug,
        score,
        mode,
      })
    }

    return NextResponse.json({ success: true, data: rating })
  } catch (err) {
    console.error('[API] POST /api/themes/[slug]/rate:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB()
    const { slug } = await params
    const payload = proxy(req)
    if (!payload) return NextResponse.json({ success: true, data: null }) // Not an error, just no user rating

    const theme = await ThemeCache.findOne({ slug })
    if (!theme) return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 })

    const rating = await Rating.findOne({ userId: payload.userId, themeId: theme._id }).lean()
    
    return NextResponse.json({ success: true, data: rating })
  } catch (err) {
    console.error('[API] GET /api/themes/[slug]/rate:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
