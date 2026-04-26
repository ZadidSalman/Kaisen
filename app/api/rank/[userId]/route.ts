import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import { getUserRank } from '@/lib/rank-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await dbConnect()
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const rank = await getUserRank(userId)
    return NextResponse.json({ success: true, rank })
  } catch (error) {
    console.error('Rank fetch error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
