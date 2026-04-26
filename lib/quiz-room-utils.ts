import { ThemeCache } from './models'

export function getThemeValue(theme: any, guessType: string): string {
  if (!theme) return 'Unknown'
  
  let value = ''
  if (guessType === 'anime') {
    value = theme.animeTitleEnglish || theme.animeTitle || (theme.animeTitleAlternative?.[0]) || 'Unknown Anime'
  } else if (guessType === 'song') {
    value = theme.songTitle || 'Unknown Song'
  } else if (guessType === 'artist') {
    value = theme.artistName || 'Unknown Artist'
  } else {
    value = theme.animeTitle || 'Unknown'
  }
  
  return value.trim()
}

export async function generateRoundOptions(correctTheme: any, guessType: string) {
  let distractorFilter: any = { 
    _id: { $ne: correctTheme._id }, 
    isPopular: true,
    audioUrl: { $ne: null }
  }
  
  // Try to find distractors that don't have the same answer value
  const correctValue = getThemeValue(correctTheme, guessType)

  if (guessType === 'artist') {
    distractorFilter.artistName = { $nin: [null, '', 'Unknown', correctTheme.artistName] }
  } else if (guessType === 'song') {
    distractorFilter.songTitle = { $nin: [null, '', 'Unknown', correctTheme.songTitle] }
  } else {
    distractorFilter.animeTitle = { $ne: correctTheme.animeTitle }
  }

  const distractors = await ThemeCache.aggregate([
    { $match: distractorFilter },
    { $sample: { size: 10 } }, // Get more than needed to filter out duplicates
    { $project: { animeTitle: 1, animeTitleEnglish: 1, animeTitleAlternative: 1, songTitle: 1, artistName: 1 } }
  ])

  // Map and filter out duplicates
  const distractorValues = Array.from(new Set(
    distractors
      .map(t => getThemeValue(t, guessType))
      .filter(v => v !== correctValue)
  )).slice(0, 3)

  const options = [correctValue, ...distractorValues]
    .sort(() => Math.random() - 0.5)
    
  return options
}


export function getCorrectAnswer(theme: any, guessType: string) {
  return getThemeValue(theme, guessType)
}

type RoomPlayerLibraryProfile = {
  userId: string
  syncedAnimeIds: Set<number>
  libraryAnimeIds: Set<number>
  exactThemeIdsByAnimeId: Map<number, Set<string>>
}

type CommonModeThemeCandidate = {
  _id: any
  anilistId: number | null
  animeTitle: string
  animeTitleEnglish?: string | null
  animeTitleAlternative?: string[]
  animeCoverImage?: string | null
  animeCoverImageSmall?: string | null
  artistName?: string | null
  songTitle?: string | null
  slug?: string
  type: 'OP' | 'ED'
  sequence: number
  audioUrl: string | null
}

type CommonModeThemeSelectionResult = {
  selectedAnimeId: number
  selectedTheme: CommonModeThemeCandidate
  candidateThemeIds: string[]
  candidateThemeSummaries: string[]
}

function pickRandomItem<T>(items: T[], randomFn: () => number = Math.random): T | null {
  if (items.length === 0) return null
  const index = Math.floor(randomFn() * items.length)
  return items[index] ?? null
}

function intersectSets<T>(left: Set<T>, right: Set<T>): Set<T> {
  const result = new Set<T>()
  for (const value of left) {
    if (right.has(value)) {
      result.add(value)
    }
  }
  return result
}

function getGuessTypeRequirements(guessType: string) {
  if (guessType === 'artist') {
    return { artistName: { $nin: [null, '', 'Unknown'] } }
  }
  if (guessType === 'song') {
    return { songTitle: { $nin: [null, '', 'Unknown'] } }
  }
  return {}
}

export function selectCommonModeThemeCandidate(
  playerProfiles: RoomPlayerLibraryProfile[],
  animeThemes: CommonModeThemeCandidate[],
  randomFn: () => number = Math.random
): CommonModeThemeSelectionResult | null {
  const groupedThemes = new Map<number, CommonModeThemeCandidate[]>()

  for (const theme of animeThemes) {
    if (!theme.anilistId || !theme.audioUrl) continue
    const existing = groupedThemes.get(theme.anilistId) || []
    existing.push(theme)
    groupedThemes.set(theme.anilistId, existing)
  }

  if (groupedThemes.size === 0 || playerProfiles.length === 0) {
    return null
  }

  let sharedAnimeIds = new Set(playerProfiles[0].libraryAnimeIds)
  for (const profile of playerProfiles.slice(1)) {
    sharedAnimeIds = intersectSets(sharedAnimeIds, profile.libraryAnimeIds)
  }

  const sharedValidThemes: CommonModeThemeCandidate[] = []
  const candidateThemeIds: string[] = []
  const candidateThemeSummaries: string[] = []
  const remainingAnimeIds = Array.from(sharedAnimeIds).filter(animeId => {
    const themes = groupedThemes.get(animeId) || []
    return themes.length > 0
  })

  for (const selectedAnimeId of remainingAnimeIds) {
    const themesForAnime = groupedThemes.get(selectedAnimeId) || []
    const allThemeIdsForAnime = new Set(themesForAnime.map(theme => String(theme._id)))

    let sharedThemeIds: Set<string> | null = null
    for (const profile of playerProfiles) {
      const localThemeIds = profile.exactThemeIdsByAnimeId.get(selectedAnimeId) || new Set<string>()
      const eligibleThemeIds =
        localThemeIds.size > 0
          ? localThemeIds
          : profile.syncedAnimeIds.has(selectedAnimeId)
            ? allThemeIdsForAnime
            : new Set<string>()

      sharedThemeIds = sharedThemeIds
        ? intersectSets(sharedThemeIds, eligibleThemeIds)
        : new Set(eligibleThemeIds)
    }

    const candidateThemes = themesForAnime.filter(theme => sharedThemeIds?.has(String(theme._id)))
    if (candidateThemes.length === 0) {
      continue
    }

    for (const candidateTheme of candidateThemes) {
      sharedValidThemes.push(candidateTheme)
      candidateThemeIds.push(String(candidateTheme._id))
      candidateThemeSummaries.push(`${candidateTheme.anilistId}:${candidateTheme.type}${candidateTheme.sequence}:${candidateTheme.slug || candidateTheme._id}`)
    }
  }

  const selectedTheme = pickRandomItem(sharedValidThemes, randomFn)
  if (!selectedTheme?.anilistId) {
    return null
  }

  return {
    selectedAnimeId: selectedTheme.anilistId,
    selectedTheme,
    candidateThemeIds,
    candidateThemeSummaries,
  }
}

async function buildRoomPlayerLibraryProfiles(room: any): Promise<RoomPlayerLibraryProfile[]> {
  const { User, WatchHistory, Rating, Favorite } = await import('./models')
  const playerUserIds = room.players.map((p: any) => p.userId)
  const users = await User.find({ _id: { $in: playerUserIds } }).select('anilist.completedMediaIds')
  const userById = new Map(users.map((user: any) => [user._id.toString(), user]))

  return Promise.all(playerUserIds.map(async (userId: string) => {
    const user = userById.get(userId)
    const syncedAnimeIds = new Set<number>((user?.anilist?.completedMediaIds || []).filter((id: any) => typeof id === 'number'))

    const [historyIds, ratedIds, favIds] = await Promise.all([
      WatchHistory.find({ userId }).distinct('themeId'),
      Rating.find({ userId }).distinct('themeId'),
      Favorite.find({ userId }).distinct('themeId')
    ])

    const localThemeIds = Array.from(new Set([...historyIds, ...ratedIds, ...favIds].map((id: any) => id.toString())))
    const localThemes = localThemeIds.length > 0
      ? await ThemeCache.find({ _id: { $in: localThemeIds } }).select('_id anilistId')
      : []

    const libraryAnimeIds = new Set<number>(syncedAnimeIds)
    const exactThemeIdsByAnimeId = new Map<number, Set<string>>()

    for (const theme of localThemes) {
      if (!theme.anilistId) continue
      libraryAnimeIds.add(theme.anilistId)
      const exactIds = exactThemeIdsByAnimeId.get(theme.anilistId) || new Set<string>()
      exactIds.add(theme._id.toString())
      exactThemeIdsByAnimeId.set(theme.anilistId, exactIds)
    }

    return {
      userId,
      syncedAnimeIds,
      libraryAnimeIds,
      exactThemeIdsByAnimeId,
    }
  }))
}

async function selectThemeForCommonMode(room: any, excludedThemeIds: string[] = []) {
  const profiles = await buildRoomPlayerLibraryProfiles(room)
  const sharedAnimeIds = profiles.length > 0
    ? Array.from(profiles[0].libraryAnimeIds).filter(animeId => profiles.every(profile => profile.libraryAnimeIds.has(animeId)))
    : []

  console.info('[QuizRoomTheme] Common mode library summary', {
    roomId: room._id?.toString?.() || room._id,
    playerCount: profiles.length,
    excludedThemeCount: excludedThemeIds.length,
    players: profiles.map(profile => ({
      userId: profile.userId,
      syncedAnimeCount: profile.syncedAnimeIds.size,
      localAnimeCount: profile.exactThemeIdsByAnimeId.size,
      libraryAnimeCount: profile.libraryAnimeIds.size,
    })),
    sharedAnimeCount: sharedAnimeIds.length,
    sharedAnimeSample: sharedAnimeIds.slice(0, 10),
  })

  if (sharedAnimeIds.length === 0) {
    return null
  }

  const commonThemeFilter: any = {
    anilistId: { $in: sharedAnimeIds },
    audioUrl: { $ne: null },
    ...getGuessTypeRequirements(room.settings.guessType),
  }

  if (excludedThemeIds.length > 0) {
    commonThemeFilter._id = { $nin: excludedThemeIds }
  }

  const animeThemes = await ThemeCache.find(commonThemeFilter).select([
    '_id',
    'anilistId',
    'animeTitle',
    'animeTitleEnglish',
    'animeTitleAlternative',
    'animeCoverImage',
    'animeCoverImageSmall',
    'artistName',
    'songTitle',
    'slug',
    'type',
    'sequence',
    'audioUrl',
  ].join(' '))

  const selection = selectCommonModeThemeCandidate(profiles, animeThemes as CommonModeThemeCandidate[])

  if (!selection) {
    console.warn('[QuizRoomTheme] Common mode could not resolve a shared theme after title selection', {
      roomId: room._id?.toString?.() || room._id,
      sharedAnimeCount: sharedAnimeIds.length,
      consideredThemeCount: animeThemes.length,
    })
    return null
  }

  console.info('[QuizRoomTheme] Common mode selection', {
    roomId: room._id?.toString?.() || room._id,
    animeId: selection.selectedAnimeId,
    animeTitle: selection.selectedTheme.animeTitleEnglish || selection.selectedTheme.animeTitle,
    candidateThemeIds: selection.candidateThemeIds,
    candidateThemes: selection.candidateThemeSummaries,
    selectedThemeId: String(selection.selectedTheme._id),
    selectedThemeSlug: selection.selectedTheme.slug,
    selectedThemeType: selection.selectedTheme.type,
    selectedThemeSequence: selection.selectedTheme.sequence,
    selectedAudioUrl: selection.selectedTheme.audioUrl,
  })

  return selection.selectedTheme
}

export async function selectThemeForRoom(room: any, excludedThemeIds: string[] = []) {
  if (room.settings.poolMode === 'common') {
    const commonTheme = await selectThemeForCommonMode(room, excludedThemeIds)
    if (commonTheme) {
      return commonTheme
    }

    console.warn('[QuizRoomTheme] Falling back from common mode to generic room filter selection', {
      roomId: room._id?.toString?.() || room._id,
      excludedThemeCount: excludedThemeIds.length,
    })
  }

  const themeFilter = await getDynamicThemeFilter(room)

  if (themeFilter._id?.$in) {
    themeFilter._id = {
      $in: themeFilter._id.$in,
      ...(excludedThemeIds.length > 0 ? { $nin: excludedThemeIds } : {}),
    }
  } else if (excludedThemeIds.length > 0) {
    themeFilter._id = { $nin: excludedThemeIds }
  }

  console.info('[QuizRoomTheme] Generic room theme filter', {
    roomId: room._id?.toString?.() || room._id,
    poolMode: room.settings.poolMode,
    guessType: room.settings.guessType,
    excludedThemeCount: excludedThemeIds.length,
    hasInclusiveIds: Boolean(themeFilter._id?.$in),
    inclusiveIdCount: themeFilter._id?.$in?.length || 0,
  })

  const [theme] = await ThemeCache.aggregate([
    { $match: themeFilter },
    { $sample: { size: 1 } }
  ])

  if (theme) {
    console.info('[QuizRoomTheme] Generic room theme selected', {
      roomId: room._id?.toString?.() || room._id,
      themeId: String(theme._id),
      animeId: theme.anilistId,
      animeTitle: theme.animeTitleEnglish || theme.animeTitle,
      themeType: theme.type,
      themeSequence: theme.sequence,
      audioUrl: theme.audioUrl,
    })
  }

  return theme || null
}

export async function getDynamicThemeFilter(room: any) {
  const { User, WatchHistory, ThemeCache, Rating, Favorite } = await import('./models')
  
  let baseFilter: any = { audioUrl: { $ne: null } }
  
  if (room.settings.guessType === 'artist') {
    baseFilter.artistName = { $nin: [null, '', 'Unknown'] }
  } else if (room.settings.guessType === 'song') {
    baseFilter.songTitle = { $nin: [null, '', 'Unknown'] }
  }

  if (room.settings.poolMode === 'random') {
    return baseFilter
  }

  // Common or Watched mode
  const playerUserIds = room.players.map((p: any) => p.userId)
  const users = await User.find({ _id: { $in: playerUserIds } }).select('anilist.completedMediaIds')
  
  let targetThemeIds: string[] = []
  
  const isCommon = room.settings.poolMode === 'common'
  
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    
    // 1. Get IDs from AniList sync
    const syncedAnilistIds = u.anilist?.completedMediaIds || []
    
    // 2. Get IDs from local activity (WatchHistory, Rating, Favorite)
    const [historyIds, ratedIds, favIds] = await Promise.all([
      WatchHistory.find({ userId: u._id }).distinct('themeId'),
      Rating.find({ userId: u._id }).distinct('themeId'),
      Favorite.find({ userId: u._id }).distinct('themeId')
    ])
    
    const localThemeIds = Array.from(
      new Set([...historyIds, ...ratedIds, ...favIds].map((id: any) => id.toString()))
    )

    // Resolve the player's AniList library into exact theme IDs, not just anime IDs.
    const syncedThemes = syncedAnilistIds.length > 0
      ? await ThemeCache.find({ anilistId: { $in: syncedAnilistIds } }).select('_id')
      : []
    const syncedThemeIds = syncedThemes.map((theme: any) => theme._id.toString())

    const playerThemeIds = Array.from(new Set([...localThemeIds, ...syncedThemeIds]))
    
    if (i === 0) {
      targetThemeIds = playerThemeIds
    } else {
      if (isCommon) {
        // Common mode must use exact shared theme IDs.
        targetThemeIds = targetThemeIds.filter(id => playerThemeIds.includes(id))
      } else {
        // Watched mode uses the union of each player's library theme IDs.
        targetThemeIds = Array.from(new Set([...targetThemeIds, ...playerThemeIds]))
      }
    }
  }

  if (targetThemeIds.length > 0) {
    return {
      ...baseFilter,
      _id: { $in: targetThemeIds }
    }
  } else {
    // If pool would be empty, we force it to match nothing so fallback kicks in
    return {
      ...baseFilter,
      _id: { $in: [] }
    }
  }
}
