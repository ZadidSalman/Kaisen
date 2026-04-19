import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'anime', 'title', 'artist'

    // 1. Get the correct theme
    const [correctTheme] = await ThemeCache.aggregate([
      { $match: { audioUrl: { $ne: null } } }, // Ensure we have audio at least
      { $sample: { size: 1 } },
    ])

    if (!correctTheme) {
      return NextResponse.json({ success: false, error: 'No themes found' }, { status: 404 })
    }

    // 2. Get 3 distractors
    // We want distractors that are different from the correct one based on the quiz type
    let filter: any = { _id: { $ne: correctTheme._id } }
    
    const distractors = await ThemeCache.aggregate([
      { $match: filter },
      { $sample: { size: 3 } },
    ])

    // Shuffle options
    const options = [correctTheme, ...distractors]
      .map(t => {
        if (type === 'anime') return t.animeTitle
        if (type === 'title') return t.songTitle
        if (type === 'artist') return t.artistName || 'Unknown Artists'
        return t.animeTitle
      })
      .sort(() => Math.random() - 0.5)

    // Remove sensitive data from correctTheme before sending to client
    const { embedding, ...safeTheme } = correctTheme

    return NextResponse.json({
      success: true,
      data: {
        questionTheme: safeTheme, // This has the video/audio
        options,
        correctValue: type === 'anime' ? correctTheme.animeTitle : (type === 'title' ? correctTheme.songTitle : correctTheme.artistName)
      }
    })

  } catch (err) {
    console.error('[API] GET /api/quiz/question:', err)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
