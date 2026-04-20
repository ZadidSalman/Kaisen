export interface IVideoSource {
  resolution: number
  url: string
  source: string | null
  mime: string
}

export interface IThemeEntry {
  atEntryId: number
  version: string
  episodes: string | null
  spoiler: boolean
  nsfw: boolean
  tags: string[]
  videoSources: IVideoSource[]
  videoUrl: string
  audioUrl: string | null
}

export interface IThemeCache {
  _id: string
  slug: string
  animethemesId: number
  songTitle: string
  artistName: string | null
  allArtists: string[]
  artistSlugs: string[]
  artistRoles: string[]
  anilistId: number | null
  kitsuId: string | null
  animeTitle: string
  animeTitleEnglish: string | null
  animeTitleAlternative: string[]
  animeSeason: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  animeSeasonYear: number | null
  animeCoverImage: string | null
  animeGrillImage: string | null
  animeStudios: string[]
  type: 'OP' | 'ED'
  sequence: number
  entries: IThemeEntry[]
  videoUrl: string
  audioUrl: string | null
  mood: string[]
  embedding: number[] | null
  avgRating: number
  totalRatings: number
  totalWatches: number
  totalListens: number
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface IArtistCache {
  _id: string
  slug: string
  animethemesId: number
  name: string
  aliases: string[]
  imageUrl: string | null
  totalThemes: number
  syncedAt: string
}

export interface IAnimeCache {
  _id: string
  anilistId: number | null
  malId: number | null
  kitsuId: string | null
  titleRomaji: string
  titleEnglish: string | null
  titleNative: string | null
  titleAlternative: string[]
  synonyms: string[]
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  seasonYear: number | null
  genres: string[]
  coverImageLarge: string | null
  bannerImage: string | null
  atCoverImage: string | null
  atGrillImage: string | null
  totalEpisodes: number | null
  status: string | null
  averageScore: number | null
  syncedAt: string
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  bio: string
  totalRatings: number
  totalFollowers: number
  totalFollowing: number
  totalTime: number
  anilist?: {
    userId: number
    username: string
    accessToken?: string
  }
}
