import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'
import { getQueryEmbedding } from '@/lib/embedding'

const MOOD_WORDS = [
  'sad', 'epic', 'calm', 'hype', 'emotional', 'dark',
  'upbeat', 'nostalgic', 'romantic', 'mysterious', 'peaceful',
  'intense', 'cheerful', 'melancholy', 'energetic',
]

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') ?? '1')

    if (q.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query too short — minimum 2 characters', code: 400 },
        { status: 400 }
      )
    }

    const limit = 20
    const skip = (page - 1) * limit
    const qLower = q.toLowerCase()

    // Detect mood words in query
    const detectedMoods = MOOD_WORDS.filter(w => qLower.includes(w))
    const isMoodQuery = detectedMoods.length > 0

    // ── LAYER 1: $text search (exact, fast, free) ──────────────────────────
    if (!isMoodQuery) {
      const textFilter: any = { $text: { $search: q } }
      if (type) textFilter.type = type.toUpperCase()

      const [textResults, textTotal] = await Promise.all([
        ThemeCache.find(textFilter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit)
          .lean(),
        ThemeCache.countDocuments(textFilter),
      ])

      if (textResults.length > 0) {
        return NextResponse.json({
          success: true,
          data: textResults,
          meta: {
            page,
            total: textTotal,
            hasMore: skip + textResults.length < textTotal,
            searchType: 'text',
          },
        })
      }
    }

    // ── LAYER 2 / 3: Vector search (semantic or mood) ─────────────────────
    // For now, if Voyage API is not set up, we fallback to a simple regex search
    if (!process.env.VOYAGE_API_KEY) {
       const regexFilter: any = {
         $or: [
           { songTitle: { $regex: q, $options: 'i' } },
           { animeTitle: { $regex: q, $options: 'i' } },
           { artistName: { $regex: q, $options: 'i' } },
         ]
       }
       if (type) regexFilter.type = type.toUpperCase()
       
       const [results, total] = await Promise.all([
         ThemeCache.find(regexFilter).skip(skip).limit(limit).lean(),
         ThemeCache.countDocuments(regexFilter)
       ])
       
       return NextResponse.json({
         success: true,
         data: results,
         meta: {
           page,
           total,
           hasMore: skip + results.length < total,
           searchType: 'regex',
         }
       })
    }

    const embedding = await getQueryEmbedding(q)

    if (!embedding) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { page: 1, total: 0, hasMore: false, searchType: 'none' },
      })
    }

    const vectorFilter: any = {}
    if (type) vectorFilter.type = { $eq: type.toUpperCase() }
    if (detectedMoods.length > 0) vectorFilter.mood = { $in: detectedMoods }

    const semanticResults = await ThemeCache.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 200,
          limit: limit,
          ...(Object.keys(vectorFilter).length > 0 ? { filter: vectorFilter } : {}),
        },
      },
      {
        $addFields: { vectorScore: { $meta: 'vectorSearchScore' } },
      },
    ])

    return NextResponse.json({
      success: true,
      data: semanticResults,
      meta: {
        page: 1,
        total: semanticResults.length,
        hasMore: false,
        searchType: isMoodQuery ? 'mood' : 'semantic',
        moods: detectedMoods,
      },
    })

  } catch (err) {
    console.error('[API] GET /api/search:', err)
    return NextResponse.json(
      { success: false, error: 'Search failed. Please try again.', code: 500 },
      { status: 500 }
    )
  }
}
