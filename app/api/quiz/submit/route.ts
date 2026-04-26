import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { QuizAttempt } from '@/lib/models'
import { proxy } from '@/proxy'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(req)
    const body = await req.json()

    const { themeSlug, atEntryId, quizType, correct, timeTaken, score, streak } = body

    const attempt = new QuizAttempt({
      userId: payload?.userId || null,
      themeSlug,
      atEntryId,
      quizType,
      correct,
      timeTaken,
      score,
      streak,
    })

    await attempt.save()

    return NextResponse.json({ success: true, data: attempt })

  } catch (err) {
    console.error('[API] POST /api/quiz/submit:', err)
    return NextResponse.json({ success: false, error: 'Failed to save attempt' }, { status: 500 })
  }
}

