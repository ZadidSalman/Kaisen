import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { getUserRank } from '@/lib/rank-utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rank = await getUserRank(session.user.id)
    return NextResponse.json({ success: true, rank })
  } catch (error) {
    console.error('Rank me fetch error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
