import fs from 'fs'
import path from 'path'

// ── Logging ──────────────────────────────────────────────────────────────────

const LOG_FILE = path.join(process.cwd(), 'scripts', 'seed.log')

export function log(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', context: string, message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] [${level}] [${context}] ${message}`
  console.log(line)
  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  }
  fs.appendFileSync(LOG_FILE, line + '\n')
}

export function logSeparator(label: string) {
  const line = `\n${'─'.repeat(60)}\n  ${label}\n${'─'.repeat(60)}`
  console.log(line)
  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  }
  fs.appendFileSync(LOG_FILE, line + '\n')
}

// ── Progress tracking ─────────────────────────────────────────────────────────

export interface SeedProgress {
  lastCompletedPage: number
  totalProcessed: number
  totalErrors: number
  nullAudioUrlCount: number
  anilistFallbacks: number
  kitsuFallbacks: number
  unknownCount: number
  startedAt: string
  lastUpdatedAt: string
}

export function loadProgress(progressFile: string): SeedProgress {
  if (fs.existsSync(progressFile)) {
    try {
      return JSON.parse(fs.readFileSync(progressFile, 'utf-8'))
    } catch {
      log('WARN', 'PROGRESS', `Could not parse progress file ${progressFile} — starting fresh`)
    }
  }
  return {
    lastCompletedPage: 0,
    totalProcessed: 0,
    totalErrors: 0,
    nullAudioUrlCount: 0,
    anilistFallbacks: 0,
    kitsuFallbacks: 0,
    unknownCount: 0,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  }
}

export function saveProgress(progressFile: string, progress: SeedProgress) {
  progress.lastUpdatedAt = new Date().toISOString()
  if (!fs.existsSync(path.dirname(progressFile))) {
    fs.mkdirSync(path.dirname(progressFile), { recursive: true })
  }
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2))
}

// ── Delays ────────────────────────────────────────────────────────────────────

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const AT_DELAY_MS      = 700   // AnimeThemes — be polite
export const ANILIST_DELAY_MS = 2000  // AniList — avoid rate limit (increased)
export const KITSU_DELAY_MS   = 500   // Kitsu — generous free tier

// ── Mood derivation ────────────────────────────────────────────────────────────

export function deriveMood(songTitle: string, animeTitle: string, genres: string[]): string[] {
  const moods: string[] = []
  const combined = [songTitle, animeTitle, ...genres].join(' ').toLowerCase()

  const moodMap: Record<string, string[]> = {
    sad:        ['sad','grief','loss','cry','tear','sorrow','melancholy'],
    emotional:  ['emotional','feel','heart','soul','memory','memories','never'],
    epic:       ['epic','battle','fight','war','hero','warrior','legend','rise'],
    calm:       ['calm','peace','gentle','soft','quiet','still','breeze'],
    hype:       ['hype','fast','rush','fire','burn','explosion','racing'],
    dark:       ['dark','death','despair','demon','devil','shadow','curse'],
    upbeat:     ['happy','joy','smile','bright','fun','cheer','bounce'],
    nostalgic:  ['past','remember','childhood','youth','old','yesterday','again'],
    romantic:   ['love','kiss','heart','together','forever','your name','promise'],
    mysterious: ['mystery','unknown','secret','hidden','void','abyss'],
  }

  for (const [mood, keywords] of Object.entries(moodMap)) {
    if (keywords.some(kw => combined.includes(kw))) {
      moods.push(mood)
    }
  }

  if (genres.includes('Romance'))          moods.push('romantic')
  if (genres.includes('Horror'))           moods.push('dark')
  if (genres.includes('Slice of Life'))    moods.push('calm')
  if (genres.includes('Action'))           moods.push('epic')
  if (genres.includes('Comedy'))           moods.push('upbeat')
  if (genres.includes('Drama'))            moods.push('emotional')
  if (genres.includes('Mystery'))          moods.push('mysterious')

  return [...new Set(moods)]
}

// ── AniList API ───────────────────────────────────────────────────────────────

export async function fetchAniList(query: string, variables: any, retryCount = 0): Promise<any> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    if (res.status === 429 && retryCount < 3) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60')
      log('WARN', 'ANILIST', `Rate limited. Retrying in ${retryAfter}s...`)
      await delay(retryAfter * 1000)
      return fetchAniList(query, variables, retryCount + 1)
    }

    if (!res.ok) {
      log('WARN', 'ANILIST', `HTTP ${res.status} for ${JSON.stringify(variables)}`)
      return null
    }

    const { data } = await res.json() as any
    return data ?? null
  } catch (err) {
    log('ERROR', 'ANILIST', `${err} for ${JSON.stringify(variables)}`)
    return null
  }
}

export async function fetchAniListByMalId(malId: number) {
  const query = `
    query ($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        id
        idMal
        title { romaji english native }
        synonyms
        season seasonYear
        genres
        episodes
        status
        averageScore
        coverImage { large medium }
        bannerImage
        studios { nodes { name } }
      }
    }
  `
  const data = await fetchAniList(query, { malId })
  return data?.Media ?? null
}

export async function fetchAniListByTitle(title: string) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        idMal
        title { romaji english native }
        synonyms
        season seasonYear
        genres
        episodes
        status
        averageScore
        coverImage { large medium }
        bannerImage
        studios { nodes { name } }
      }
    }
  `
  const data = await fetchAniList(query, { search: title })
  return data?.Media ?? null
}

// ── Kitsu API ─────────────────────────────────────────────────────────────────

export async function fetchKitsuByTitle(title: string) {
  try {
    const encoded = encodeURIComponent(title)
    const res = await fetch(
      `https://kitsu.io/api/edge/anime?filter[text]=${encoded}&page[limit]=1`,
      { headers: { 'Accept': 'application/vnd.api+json' } }
    )
    if (!res.ok) {
      log('WARN', 'KITSU', `title search "${title}" → HTTP ${res.status}`)
      return null
    }
    const { data } = await res.json() as any
    if (!data || data.length === 0) return null

    const anime = data[0]
    const attrs = anime.attributes

    let season: string | null = null
    let seasonYear: number | null = null
    if (attrs.startDate) {
      const d = new Date(attrs.startDate)
      seasonYear = d.getFullYear()
      const month = d.getMonth() + 1
      season = month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL'
    }

    return {
      kitsuId:      anime.id,
      titleEnglish: attrs.titles?.en || attrs.titles?.en_us || null,
      titleJapanese:attrs.titles?.ja_jp || null,
      season,
      seasonYear,
      posterImage:  attrs.posterImage?.large ?? null,
      coverImage:   attrs.coverImage?.large ?? null,
    }
  } catch (err) {
    log('ERROR', 'KITSU', `title search "${title}" → ${err}`)
    return null
  }
}

// ── AnimeThemes API ───────────────────────────────────────────────────────────

const AT_BASE = 'https://api.animethemes.moe'

export async function fetchATPage(page: number, include: string, apiFilter?: string) {
  return fetchATResourcePage('animetheme', page, include, apiFilter)
}

export async function fetchATResourcePage(resource: string, page: number, include: string, apiFilter?: string) {
  let url = `${AT_BASE}/${resource}?page[size]=100&page[number]=${page}&include=${include}`
  if (apiFilter) url += `&${apiFilter}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } })
  if (!res.ok) throw new Error(`AT ${resource} page ${page} → HTTP ${res.status}`)
  return res.json()
}

export async function fetchATTotalPages(): Promise<number> {
  const res = await fetch(
    `${AT_BASE}/animetheme?page[size]=1&page[number]=1&include=animethemeentries.videos`,
    { headers: { 'User-Agent': 'Kaikansen/1.0.0' } }
  )
  if (!res.ok) throw new Error(`AT total pages → HTTP ${res.status}`)
  const data = await res.json() as any
  return Math.ceil(data.meta.total / 100)
}

export async function fetchATThemesByIds(ids: number[], include: string) {
  const url = `${AT_BASE}/animetheme?filter[id]=${ids.join(',')}&include=${include}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } })
  if (!res.ok) throw new Error(`AT themes by ids → HTTP ${res.status}`)
  return res.json()
}

// ── Theme parsing ─────────────────────────────────────────────────────────────

export function buildVersionLabel(tags: string[]): string {
  if (!tags || tags.length === 0) return 'Standard'
  return tags.map(t => t.toUpperCase()).join('+')
}

export function parseATTheme(atTheme: any, genres: string[] = []): any | null {
  try {
    const anime = atTheme.anime
    if (!anime) return null

    const entries = atTheme.animethemeentries ?? []
    if (entries.length === 0) {
      log('WARN', 'PARSE', `Theme ${atTheme.id} "${atTheme.song?.title}" has no entries — skipping`)
      return null
    }

    const parsedEntries: any[] = []
    let nullAudioCount = 0

    for (const entry of entries) {
      const videos = (entry.videos ?? []).sort((a: any, b: any) => b.resolution - a.resolution)

      if (videos.length === 0) {
        log('WARN', 'PARSE', `Entry ${entry.id} of theme ${atTheme.id} has no videos — audioUrl will be null`)
        nullAudioCount++
      }

      const tags: string[] = []
      if (videos[0]?.nc)                           tags.push('NC')
      if (videos[0]?.bd || videos[0]?.source === 'BD') tags.push('BD')
      if (videos[0]?.tags?.includes('Lyrics'))     tags.push('Lyrics')
      if (videos[0]?.tags?.includes('Piano'))      tags.push('Piano')
      if (entry.version && typeof entry.version === 'number' && entry.version > 1) {
        tags.push(`V${entry.version}`)
      }

      const videoSources = videos.map((v: any) => ({
        resolution: v.resolution,
        url:        v.link,
        source:     v.source ?? null,
        mime:       'video/webm',
      }))

      parsedEntries.push({
        atEntryId:    entry.id,
        version:      buildVersionLabel(tags),
        episodes:     entry.episodes ?? null,
        spoiler:      entry.spoiler ?? false,
        nsfw:         entry.nsfw ?? false,
        tags,
        videoSources,
        videoUrl:     videos[0]?.link ?? null,
        audioUrl:     videos.length > 0 ? videos[videos.length - 1].link : null,
      })
    }

    const validEntries = parsedEntries.filter(e => e.videoUrl !== null)
    if (validEntries.length === 0) {
      log('WARN', 'PARSE', `Theme ${atTheme.id} has no usable entries after filtering — skipping`)
      return null
    }

    const standardEntry = validEntries.find(e => e.tags.length === 0) ?? validEntries[0]

    const artists = atTheme.song?.artists ?? []
    const allArtists  = artists.map((a: any) => a.name).filter(Boolean)
    const artistSlugs = artists.map((a: any) => a.slug).filter(Boolean)
    const artistRoles = artists.map((a: any) => a.as ?? 'performer')

    const images       = anime.images ?? []
    // log('INFO', 'AT', `Anime ${anime.name} images: ${JSON.stringify(images.map((i: any) => i.facet))}`)
    const atCoverImage = images.find((i: any) => i.facet === 'Large Cover')?.link ?? 
                         images.find((i: any) => i.facet === 'Cover')?.link ?? null
    const atGrillImage = images.find((i: any) => i.facet === 'Grill')?.link ?? null
    const atSmallCover = images.find((i: any) => i.facet === 'Small Cover')?.link ?? null

    const atStudios = (anime.studios ?? []).map((s: any) => s.name).filter(Boolean)
    const atSeries  = (anime.series ?? []).map((s: any) => s.name).filter(Boolean)

    const slug = `${anime.slug}-${atTheme.type.toLowerCase()}${atTheme.sequence ?? 1}-${atTheme.id}`

    const mood = deriveMood(atTheme.song?.title ?? '', anime.name ?? '', genres)

    return {
      slug,
      animethemesId:         atTheme.id,
      songTitle:             atTheme.song?.title ?? 'Unknown',
      artistName:            allArtists[0] ?? null,
      allArtists,
      artistSlugs,
      artistRoles,
      animeTitle:            anime.name,
      animeTitleEnglish:     null,
      animeTitleAlternative: [],
      animeSeason:           anime.season?.toUpperCase() ?? null,
      animeSeasonYear:       anime.year ?? null,
      animeCoverImage:       atCoverImage,
      animeCoverImageSmall:  atSmallCover,
      animeGrillImage:       atGrillImage,
      animeStudios:          atStudios,
      animeSeries:           atSeries,
      type:                  atTheme.type as 'OP' | 'ED',
      sequence:              atTheme.sequence ?? 1,
      entries:               validEntries,
      videoUrl:              standardEntry.videoUrl,
      audioUrl:              standardEntry.audioUrl,
      mood,
      embedding:             null,
      anilistId:             null,
      kitsuId:               null,
      syncedAt:              new Date(),
      _nullAudioCount:       nullAudioCount,
    }
  } catch (err) {
    log('ERROR', 'PARSE', `Failed to parse theme ${atTheme?.id}: ${err}`)
    return null
  }
}

export async function enrichTheme(
  themeDoc: any,
  atAnime: any,
  progress: SeedProgress,
): Promise<any> {
  let anilistData = null
  let kitsuData   = null

  if (atAnime.malId) {
    await delay(ANILIST_DELAY_MS)
    anilistData = await fetchAniListByMalId(atAnime.malId)
    if (anilistData) {
      log('SUCCESS', 'ANILIST', `Theme "${themeDoc.songTitle}" → AniList id ${anilistData.id} via malId`)
      progress.anilistFallbacks++
    }
  }

  if (!anilistData) {
    await delay(ANILIST_DELAY_MS)
    anilistData = await fetchAniListByTitle(atAnime.name)
    if (anilistData) {
      log('SUCCESS', 'ANILIST', `Theme "${themeDoc.songTitle}" → AniList id ${anilistData.id} via title search`)
      progress.anilistFallbacks++
    } else {
      log('WARN', 'ANILIST', `Theme "${themeDoc.songTitle}" → AniList not found`)
    }
  }

  if (!anilistData) {
    await delay(KITSU_DELAY_MS)
    kitsuData = await fetchKitsuByTitle(atAnime.name)
    if (kitsuData) {
      log('SUCCESS', 'KITSU', `Theme "${themeDoc.songTitle}" → Kitsu id ${kitsuData.kitsuId}`)
      progress.kitsuFallbacks++
    } else {
      log('WARN', 'KITSU', `Theme "${themeDoc.songTitle}" → Not found on Kitsu either → fields will be null`)
      progress.unknownCount++
    }
  }

  const animeTitleEnglish =
    anilistData?.title?.english ??
    kitsuData?.titleEnglish ??
    null

  const altNames = [
    anilistData?.title?.native,
    anilistData?.title?.romaji,
    ...(anilistData?.synonyms ?? []),
    kitsuData?.titleJapanese,
  ].filter(Boolean).filter((t: string) => t !== themeDoc.animeTitle)
  const animeTitleAlternative = [...new Set(altNames)]

  const animeSeason = themeDoc.animeSeason ??
    anilistData?.season ??
    kitsuData?.season ??
    null

  const animeSeasonYear = themeDoc.animeSeasonYear ??
    anilistData?.seasonYear ??
    kitsuData?.seasonYear ??
    null

  const animeCoverImage =
    themeDoc.animeCoverImage ??
    anilistData?.coverImage?.large ??
    kitsuData?.posterImage ??
    null

  const animeCoverImageSmall =
    themeDoc.animeCoverImageSmall ??
    anilistData?.coverImage?.medium ??
    themeDoc.animeCoverImage ?? // Fallback to AT cover if AniList medium is missing
    null

  const animeGrillImage =
    themeDoc.animeGrillImage ??
    anilistData?.bannerImage ??
    kitsuData?.coverImage ??
    null

  const genres = anilistData?.genres ?? []
  const mood = deriveMood(themeDoc.songTitle, themeDoc.animeTitle, genres)

  const studios = [
    ...themeDoc.animeStudios,
    ...(anilistData?.studios?.nodes?.map((n: any) => n.name) ?? []),
  ]
  const animeStudios = [...new Set(studios)].filter(Boolean)

  const series = [
    ...themeDoc.animeSeries,
  ]
  const animeSeries = [...new Set(series)].filter(Boolean)

  return {
    ...themeDoc,
    anilistId:             anilistData?.id ?? null,
    malId:                 anilistData?.idMal ?? null,
    kitsuId:               kitsuData?.kitsuId ?? null,
    animeTitleEnglish,
    animeTitleAlternative,
    titleNative:           anilistData?.title?.native ?? null,
    synonyms:              anilistData?.synonyms ?? [],
    animeSeason,
    animeSeasonYear,
    animeCoverImage,
    animeCoverImageSmall,
    animeGrillImage,
    coverImageLarge:       anilistData?.coverImage?.large ?? null,
    coverImageMedium:      anilistData?.coverImage?.medium ?? null,
    bannerImage:           anilistData?.bannerImage ?? null,
    genres:                anilistData?.genres ?? [],
    studios:               animeStudios,
    series:                animeSeries,
    animeStudios,
    animeSeries,
    totalEpisodes:         anilistData?.episodes ?? null,
    animeStatus:           anilistData?.status ?? null,
    averageScore:          anilistData?.averageScore ?? null,
    mood,
    _nullAudioCount:       undefined,
  }
}
