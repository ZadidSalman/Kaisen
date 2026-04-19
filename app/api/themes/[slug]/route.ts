import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB()
    const { slug } = await params

    const theme = await ThemeCache.findOne({ slug }).lean()
    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme not found', code: 404 }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: theme })
  } catch (err) {
    console.error('[API] GET /api/themes/[slug]:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
