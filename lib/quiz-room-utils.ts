import { ThemeCache } from './models'
import mongoose from 'mongoose'

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
  
  let targetAnilistIds: number[] = []
  let targetThemeIds: string[] = [] // Specific themes from history/ratings/favs
  
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
    
    const localThemeIdsRaw = Array.from(new Set([...historyIds, ...ratedIds, ...favIds]))
    
    // Resolve anilistIds for local activity to expand the pool to the entire anime
    const localThemes = await ThemeCache.find({ _id: { $in: localThemeIdsRaw } }).select('anilistId')
    const localAnilistIds = localThemes.map(t => t.anilistId).filter((id: any): id is number => id !== null)
    
    const playerAnilistIds = Array.from(new Set([...syncedAnilistIds, ...localAnilistIds]))
    const playerThemeIds = localThemeIdsRaw.map((id: any) => id.toString())
    
    if (i === 0) {
      targetAnilistIds = playerAnilistIds
      targetThemeIds = playerThemeIds
    } else {
      if (isCommon) {
        // Intersection: must be in BOTH lists
        targetAnilistIds = targetAnilistIds.filter(id => playerAnilistIds.includes(id))
        targetThemeIds = targetThemeIds.filter(id => playerThemeIds.includes(id))
      } else {
        // Watched Mode: Union (shows from anyone's library)
        targetAnilistIds = Array.from(new Set([...targetAnilistIds, ...playerAnilistIds]))
        targetThemeIds = Array.from(new Set([...targetThemeIds, ...playerThemeIds]))
      }
    }
  }

  const poolConditions = []
  if (targetAnilistIds.length > 0) {
    poolConditions.push({ anilistId: { $in: targetAnilistIds } })
  }
  if (targetThemeIds.length > 0) {
    poolConditions.push({ _id: { $in: targetThemeIds } })
  }

  if (poolConditions.length > 0) {
    return {
      ...baseFilter,
      $or: poolConditions
    }
  } else {
    // If pool would be empty, we force it to match nothing so fallback kicks in
    return {
      ...baseFilter,
      _id: { $in: [] }
    }
  }
}
