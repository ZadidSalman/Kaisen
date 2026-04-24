import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, Comment } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const comments = await Comment.find({ themeSlug: slug })
      .populate('userId', 'username displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, data: comments })
  } catch (err) {
    console.error('[API] GET /api/themes/[slug]/comments:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const userPayload = proxy(req)
    if (!userPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    }

    const { slug } = await params
    const { content } = await req.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ success: false, error: 'Comment is too long (max 1000 chars)' }, { status: 400 })
    }

    await connectDB()

    const theme = await ThemeCache.findOne({ slug }).select('_id').lean()
    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme not found', code: 404 }, { status: 404 })
    }

    const comment = await Comment.create({
      userId: userPayload.userId,
      themeId: theme._id,
      themeSlug: slug,
      content: content.trim(),
    })

    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username displayName avatarUrl')
      .lean()

    return NextResponse.json({ success: true, data: populatedComment })
  } catch (err) {
    console.error('[API] POST /api/themes/[slug]/comments:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
