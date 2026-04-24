import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User, AnimeCache, ArtistCache } from '@/lib/models'
import { getQueryEmbedding } from '@/lib/embedding'

const MOOD_WORDS = [
  'sad', 'epic', 'calm', 'hype', 'emotional', 'dark',
  'upbeat', 'nostalgic', 'romantic', 'mysterious', 'peaceful',
  'intense', 'cheerful', 'melancholy', 'energetic',
]

/**
 * Parses OP/ED type and optional sequence number out of the raw query tokens.
 * Handles: "op", "ed", "op9", "ed12", "op 9", "ed 3"
 * Returns the cleaned word list (without op/ed tokens) plus extracted filters.
 */
function parseThemeModifiers(words: string[]): {
  cleanWords: string[]
  themeTypeFilter: 'OP' | 'ED' | null
  themeSeqFilter: number | null
} {
  let themeTypeFilter: 'OP' | 'ED' | null = null
  let themeSeqFilter: number | null = null
  const cleanWords: string[] = []

  let i = 0
  while (i < words.length) {
    const w = words[i].toLowerCase()
    // Token like "op9" or "ed12" or bare "op"/"ed"
    const inlineMatch = w.match(/^(op|ed)(\d+)?$/)
    if (inlineMatch) {
      themeTypeFilter = inlineMatch[1].toUpperCase() as 'OP' | 'ED'
      if (inlineMatch[2]) {
        // Sequence embedded: "op9" → sequence 9
        themeSeqFilter = parseInt(inlineMatch[2])
      } else if (i + 1 < words.length && /^\d+$/.test(words[i + 1])) {
        // Next token is a bare number: "op 9" → sequence 9
        themeSeqFilter = parseInt(words[i + 1])
        i++ // consume the number token
      }
    } else {
      cleanWords.push(words[i])
    }
    i++
  }

  return { cleanWords, themeTypeFilter, themeSeqFilter }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const type = (searchParams.get('type') ?? 'ALL').toUpperCase()
    const page = parseInt(searchParams.get('page') ?? '1')

    if (q.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query too short — minimum 2 characters', code: 400 },
        { status: 400 }
      )
    }

    const limit = type === 'ALL' ? 5 : 20
    const skip = (page - 1) * limit
    const qLower = q.toLowerCase()

    const detectedMoods = MOOD_WORDS.filter(w => qLower.includes(w))
    const isMoodQuery = detectedMoods.length > 0

    let users: any[] = []
    let artists: any[] = []
    let anime: any[] = []
    let songs: any[] = []
    let total = 0

    if (!isMoodQuery) {
      const words = q.split(/\s+/).filter(w => w.length > 0)

      // ── OP / ED + Sequence detection ────────────────────────────────────
      const { cleanWords, themeTypeFilter, themeSeqFilter } = parseThemeModifiers(words)
      const themeModifierUsed = themeTypeFilter !== null

      // Users & Artists & Anime: use cleanWords (OP/ED stripped)
      const userConditions = cleanWords.map(word => ({
        $or: [
          { username: { $regex: word, $options: 'i' } },
          { displayName: { $regex: word, $options: 'i' } }
        ]
      }))
      const userRegexFilter: any = { isPublic: true }
      if (userConditions.length > 0) userRegexFilter.$and = userConditions

      // Themes: use cleanWords + apply type/sequence filters
      const themeConditions = cleanWords.map(word => ({
        $or: [
          { animeTitle: { $regex: word, $options: 'i' } },
          { songTitle:  { $regex: word, $options: 'i' } },
          { artistName: { $regex: word, $options: 'i' } },
        ]
      }))
      let themeRegexFilter: any =
        themeConditions.length === 1 ? themeConditions[0] :
        themeConditions.length >  1  ? { $and: themeConditions } : {}

      if (themeTypeFilter)         themeRegexFilter.type     = themeTypeFilter
      if (themeSeqFilter !== null) themeRegexFilter.sequence = themeSeqFilter

      const artistConditions = cleanWords.map(word => ({
        $or: [
          { name:    { $regex: word, $options: 'i' } },
          { aliases: { $regex: word, $options: 'i' } }
        ]
      }))
      const artistRegexFilter: any =
        artistConditions.length === 1 ? artistConditions[0] :
        artistConditions.length >  1  ? { $and: artistConditions } : {}

      const animeConditions = cleanWords.map(word => ({
        $or: [
          { titleRomaji:  { $regex: word, $options: 'i' } },
          { titleEnglish: { $regex: word, $options: 'i' } },
          { synonyms:     { $regex: word, $options: 'i' } }
        ]
      }))
      const animeRegexFilter: any =
        animeConditions.length === 1 ? animeConditions[0] :
        animeConditions.length >  1  ? { $and: animeConditions } : {}

      const promises = []

      // When OP/ED is typed, skip irrelevant categories to reduce noise
      if (!themeModifierUsed && (type === 'ALL' || type === 'USERS')) {
        promises.push(User.find(userRegexFilter).select('username displayName avatarUrl bio').skip(skip).limit(limit).lean().then(res => { users = res }))
        if (type === 'USERS') promises.push(User.countDocuments(userRegexFilter).then(c => { total = c }))
      }
      if (!themeModifierUsed && (type === 'ALL' || type === 'ARTISTS')) {
        promises.push(ArtistCache.find(artistRegexFilter).select('name imageUrl slug').skip(skip).limit(limit).lean().then(res => { artists = res }))
        if (type === 'ARTISTS') promises.push(ArtistCache.countDocuments(artistRegexFilter).then(c => { total = c }))
      }
      if (!themeModifierUsed && (type === 'ALL' || type === 'ANIME')) {
        promises.push(AnimeCache.find(animeRegexFilter).select('titleRomaji titleEnglish coverImageLarge kitsuId malId anilistId').skip(skip).limit(limit).lean().then(res => { anime = res }))
        if (type === 'ANIME') promises.push(AnimeCache.countDocuments(animeRegexFilter).then(c => { total = c }))
      }
      if (type === 'ALL' || type === 'SONGS') {
        // When filtering by OP/ED always use larger limit to show all franchise variants
        const songsLimit = themeModifierUsed ? 50 : limit
        promises.push(
          ThemeCache.find(themeRegexFilter)
            .select({ embedding: 0, animeGrillImage: 0, syncedAt: 0, animeTitleAlternative: 0, animeStudios: 0, animeSeries: 0 })
            .sort({ animeTitle: 1, sequence: 1 })
            .skip(skip)
            .limit(songsLimit)
            .lean()
            .then(res => { songs = res })
        )
        if (type === 'SONGS' || themeModifierUsed) {
          promises.push(ThemeCache.countDocuments(themeRegexFilter).then(c => { total = c }))
        }
      }

      await Promise.all(promises)

      if (users.length > 0 || artists.length > 0 || anime.length > 0 || songs.length > 0) {
        return NextResponse.json({
          success: true,
          data: { songs, artists, anime, users },
          meta: {
            page,
            total,
            hasMore: type === 'ALL' ? false : skip + (songs.length || artists.length || anime.length || users.length) < total,
            searchType: 'regex',
            themeTypeFilter,
            themeSeqFilter,
          },
        })
      }
    }

    if (!process.env.VOYAGE_API_KEY) {
      return NextResponse.json({
        success: true,
        data: { songs: [], artists: [], anime: [], users: [] },
        meta: { page: 1, total: 0, hasMore: false, searchType: 'none' },
      })
    }

    const embedding = await getQueryEmbedding(q)

    if (!embedding) {
      return NextResponse.json({
        success: true,
        data: { songs: [], artists: [], anime: [], users: [] },
        meta: { page: 1, total: 0, hasMore: false, searchType: 'none' },
      })
    }

    const vectorFilter: any = {}
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
      { $addFields: { vectorScore: { $meta: 'vectorSearchScore' } } },
      { $project: { embedding: 0, animeGrillImage: 0, syncedAt: 0, animeTitleAlternative: 0, animeStudios: 0, animeSeries: 0 } }
    ])

    return NextResponse.json({
      success: true,
      data: { songs: semanticResults, artists: [], anime: [], users: [] },
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
