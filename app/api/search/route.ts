import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ThemeCache, User, AnimeCache, ArtistCache } from '@/lib/models'

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
    const words = q.split(/\s+/).filter(w => w.length > 0)

    // ── OP / ED + Sequence detection ────────────────────────────────────
    const { cleanWords, themeTypeFilter, themeSeqFilter } = parseThemeModifiers(words)
    const themeModifierUsed = themeTypeFilter !== null

    // Users Filter
    const userConditions = cleanWords.map(word => ({
      $or: [
        { username: { $regex: word, $options: 'i' } },
        { displayName: { $regex: word, $options: 'i' } }
      ]
    }))
    const userRegexFilter: any = { isPublic: true }
    if (userConditions.length > 0) userRegexFilter.$and = userConditions

    // Themes Filter
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

    // Artists Filter
    const artistConditions = cleanWords.map(word => ({
      $or: [
        { name:    { $regex: word, $options: 'i' } },
        { aliases: { $regex: word, $options: 'i' } }
      ]
    }))
    const artistRegexFilter: any =
      artistConditions.length === 1 ? artistConditions[0] :
      artistConditions.length >  1  ? { $and: artistConditions } : {}

    // Anime Filter
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

    let users: any[] = []
    let artists: any[] = []
    let anime: any[] = []
    let songs: any[] = []
    let totalCount = 0

    const promises: Promise<any>[] = []

    // Parallelize all queries based on type
    if (!themeModifierUsed && (type === 'ALL' || type === 'USERS')) {
      promises.push(User.find(userRegexFilter).select('username displayName avatarUrl bio').skip(skip).limit(limit).lean().then(res => { users = res }))
      if (type === 'USERS') promises.push(User.countDocuments(userRegexFilter).then(c => { totalCount = c }))
    }

    if (!themeModifierUsed && (type === 'ALL' || type === 'ARTISTS')) {
      promises.push(ArtistCache.find(artistRegexFilter).select('name imageUrl slug').skip(skip).limit(limit).lean().then(res => { artists = res }))
      if (type === 'ARTISTS') promises.push(ArtistCache.countDocuments(artistRegexFilter).then(c => { totalCount = c }))
    }

    if (!themeModifierUsed && (type === 'ALL' || type === 'ANIME')) {
      promises.push(AnimeCache.find(animeRegexFilter).select('titleRomaji titleEnglish coverImageLarge kitsuId malId anilistId').skip(skip).limit(limit).lean().then(res => { anime = res }))
      if (type === 'ANIME') promises.push(AnimeCache.countDocuments(animeRegexFilter).then(c => { totalCount = c }))
    }

    if (type === 'ALL' || type === 'SONGS') {
      const songsLimit = themeModifierUsed ? 50 : limit
      promises.push(
        ThemeCache.find(themeRegexFilter)
          .select({ embedding: 0, mood: 0, animeGrillImage: 0, syncedAt: 0, animeTitleAlternative: 0, animeStudios: 0, animeSeries: 0 })
          .sort({ totalWatches: -1, avgRating: -1 })
          .skip(skip)
          .limit(songsLimit)
          .lean()
          .then(res => { songs = res })
      )
      if (type === 'SONGS' || themeModifierUsed) {
        promises.push(ThemeCache.countDocuments(themeRegexFilter).then(c => { totalCount = c }))
      }
    }

    await Promise.all(promises)

    // Calculate hasMore based on actual results and total count
    const currentResultsCount = songs.length || artists.length || anime.length || users.length
    const hasMore = type === 'ALL' ? false : (skip + currentResultsCount) < totalCount

    return NextResponse.json({
      success: true,
      data: { songs, artists, anime, users },
      meta: {
        page,
        total: totalCount,
        hasMore,
        searchType: 'regex',
        themeTypeFilter,
        themeSeqFilter,
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
