import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  displayName: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  bio: string
  totalRatings: number
  totalFollowers: number
  totalFollowing: number
  totalTime: number
  isPublic: boolean
  anilist?: {
    accessToken: string
    userId: number
    username: string
    syncedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  username:       { type: String, required: true, unique: true, trim: true, lowercase: true },
  displayName:    { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  passwordHash:   { type: String, required: true },
  avatarUrl:      { type: String, default: null },
  bio:            { type: String, default: '', maxlength: 200 },
  totalRatings:   { type: Number, default: 0 },
  totalFollowers: { type: Number, default: 0 },
  totalFollowing: { type: Number, default: 0 },
  totalTime:      { type: Number, default: 0 },
  isPublic:       { type: Boolean, default: true },
  anilist: {
    accessToken: { type: String },
    userId:      { type: Number },
    username:    { type: String },
    syncedAt:    { type: Date }
  }
}, { timestamps: true })

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

interface IVideoSource {
  resolution: number
  url: string
  source: string | null
  mime: string
}

interface IThemeEntry {
  atEntryId: number
  version: string
  episodes: string | null
  spoiler: boolean
  nsfw: boolean
  tags: string[]
  videoSources: IVideoSource[]
  videoUrl: string
  audioUrl: string | null
  duration: number | null
}

export interface IThemeCache extends Document {
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
  animeCoverImageSmall: string | null
  animeGrillImage: string | null
  animeStudios: string[]
  animeSeries: string[]
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
  duration: number
  syncedAt: Date
  isPopular?: boolean
  popularRank?: number
  featuredAt?: Date
}

const VideoSourceSchema = new Schema<IVideoSource>({
  resolution: { type: Number, required: true },
  url:        { type: String, required: true },
  source:     { type: String, default: null },
  mime:       { type: String, default: 'video/webm' },
}, { _id: false })

const ThemeEntrySchema = new Schema<IThemeEntry>({
  atEntryId:    { type: Number, required: true },
  version:      { type: String, default: 'Standard' },
  episodes:     { type: String, default: null },
  spoiler:      { type: Boolean, default: false },
  nsfw:         { type: Boolean, default: false },
  tags:         [{ type: String }],
  videoSources: [VideoSourceSchema],
  videoUrl:     { type: String, default: null },
  audioUrl:     { type: String, default: null },
  duration:     { type: Number, default: 90 },
}, { _id: false })

const ThemeCacheSchema = new Schema<IThemeCache>({
  slug:                   { type: String, required: true, unique: true },
  animethemesId:          { type: Number, required: true, unique: true },
  songTitle:              { type: String, required: true },
  artistName:             { type: String, default: null },
  allArtists:             [{ type: String }],
  artistSlugs:            [{ type: String }],
  artistRoles:            [{ type: String }],
  anilistId:              { type: Number, default: null },
  kitsuId:                { type: String, default: null },
  animeTitle:             { type: String, required: true },
  animeTitleEnglish:      { type: String, default: null },
  animeTitleAlternative:  [{ type: String }],
  animeSeason:            { type: String, enum: ['WINTER','SPRING','SUMMER','FALL'], default: null },
  animeSeasonYear:        { type: Number, default: null },
  animeCoverImage:        { type: String, default: null },
  animeCoverImageSmall:   { type: String, default: null },
  animeGrillImage:        { type: String, default: null },
  animeStudios:           [{ type: String }],
  animeSeries:            [{ type: String }],
  type:                   { type: String, enum: ['OP','ED'], required: true },
  sequence:               { type: Number, required: true },
  entries:                [ThemeEntrySchema],
  videoUrl:               { type: String, required: true },
  audioUrl:               { type: String, default: null },
  mood:                   [{ type: String }],
  embedding:              { type: [Number], default: null },
  avgRating:              { type: Number, default: 0 },
  totalRatings:           { type: Number, default: 0 },
  totalWatches:           { type: Number, default: 0 },
  totalListens:           { type: Number, default: 0 },
  duration:               { type: Number, default: 90 },
  syncedAt:               { type: Date, required: true },
  isPopular:              { type: Boolean, default: false },
  popularRank:            { type: Number, default: null },
  featuredAt:             { type: Date, default: null },
}, { timestamps: true })

ThemeCacheSchema.index({
  songTitle:              'text',
  artistName:             'text',
  allArtists:             'text',
  animeTitle:             'text',
  animeTitleEnglish:      'text',
  animeTitleAlternative:  'text',
}, {
  weights: {
    songTitle:             10,
    artistName:            9,
    allArtists:            8,
    animeTitle:            6,
    animeTitleEnglish:     5,
    animeTitleAlternative: 3,
  },
  name: 'theme_full_search',
})

ThemeCacheSchema.index({ animeSeason: 1, animeSeasonYear: 1 })
ThemeCacheSchema.index({ avgRating: -1, totalRatings: -1 })
ThemeCacheSchema.index({ totalWatches: -1 })
ThemeCacheSchema.index({ artistSlugs: 1 })
ThemeCacheSchema.index({ type: 1 })
ThemeCacheSchema.index({ anilistId: 1 })
ThemeCacheSchema.index({ mood: 1 })
ThemeCacheSchema.index({ isPopular: -1, popularRank: 1 })

export const ThemeCache = mongoose.models.ThemeCache || mongoose.model<IThemeCache>('ThemeCache', ThemeCacheSchema)

const AnimeCacheSchema = new Schema({
  anilistId:             { type: Number, default: null },
  malId:                 { type: Number, default: null },
  kitsuId:               { type: String, default: null },
  titleRomaji:           { type: String, required: true },
  titleEnglish:          { type: String, default: null },
  titleNative:           { type: String, default: null },
  titleAlternative:      [{ type: String }],
  synonyms:              [{ type: String }],
  season:                { type: String, enum: ['WINTER','SPRING','SUMMER','FALL'], default: null },
  seasonYear:            { type: Number, default: null },
  genres:                [{ type: String }],
  coverImageLarge:       { type: String, default: null },
  coverImageMedium:      { type: String, default: null },
  bannerImage:           { type: String, default: null },
  atCoverImage:          { type: String, default: null },
  atGrillImage:          { type: String, default: null },
  studios:               [{ type: String }],
  series:                [{ type: String }],
  totalEpisodes:         { type: Number, default: null },
  status:                { type: String, default: null },
  averageScore:          { type: Number, default: null },
  syncedAt:              { type: Date, required: true },
}, { timestamps: true })

AnimeCacheSchema.index({ anilistId: 1 })
AnimeCacheSchema.index({ malId: 1 })
AnimeCacheSchema.index({ kitsuId: 1 })

export const AnimeCache = mongoose.models.AnimeCache || mongoose.model('AnimeCache', AnimeCacheSchema)

const ArtistCacheSchema = new Schema({
  slug:          { type: String, required: true, unique: true },
  animethemesId: { type: Number, required: true },
  name:          { type: String, required: true },
  aliases:       [{ type: String }],
  imageUrl:      { type: String, default: null },
  totalThemes:   { type: Number, default: 0 },
  syncedAt:      { type: Date, required: true },
}, { timestamps: true })

ArtistCacheSchema.index({ name: 'text', aliases: 'text' })

export const ArtistCache = mongoose.models.ArtistCache || mongoose.model('ArtistCache', ArtistCacheSchema)

const RatingSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  themeId:   { type: Schema.Types.ObjectId, ref: 'ThemeCache', required: true },
  themeSlug: { type: String, required: true },
  score:     { type: Number, required: true, min: 1, max: 10 },
  mode:      { type: String, enum: ['watch', 'listen'], required: true },
}, { timestamps: true })

RatingSchema.index({ userId: 1, themeId: 1 }, { unique: true })
RatingSchema.index({ userId: 1 })
RatingSchema.index({ themeId: 1 })
RatingSchema.index({ createdAt: -1 })

RatingSchema.post('save', async function () {
  const stats = await mongoose.model('Rating').aggregate([
    { $match: { themeId: this.themeId } },
    { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  const avg = stats[0]?.avg ?? 0
  await mongoose.model('ThemeCache').findByIdAndUpdate(this.themeId, {
    avgRating:    isNaN(avg) ? 0 : parseFloat(avg.toFixed(2)),
    totalRatings: stats[0]?.count ?? 0,
  })
  if (this.isNew) {
    await mongoose.model('User').findByIdAndUpdate(
      this.userId,
      { $inc: { totalRatings: 1 } }
    )
  }
})

export const Rating = mongoose.models.Rating || mongoose.model('Rating', RatingSchema)

const WatchHistorySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  themeId:     { type: Schema.Types.ObjectId, ref: 'ThemeCache', required: true },
  themeSlug:   { type: String, required: true },
  atEntryId:   { type: Number, default: null },
  mode:        { type: String, enum: ['watch', 'listen'], required: true },
  viewedAt:    { type: Date, default: Date.now },
}, { timestamps: false })

WatchHistorySchema.index({ userId: 1, viewedAt: -1 })
WatchHistorySchema.index({ themeId: 1 })
WatchHistorySchema.index({ viewedAt: -1 })

WatchHistorySchema.post('save', async function (doc) {
  try {
    const field = doc.mode === 'watch' ? 'totalWatches' : 'totalListens'
    const theme = await mongoose.model('ThemeCache').findById(doc.themeId)
    
    if (theme) {
      console.log(`[WatchHistory Hook] Incrementing ${field} for theme ${theme.slug}`)
      
      // Atomic increment on theme
      // Ensure fields exist or start from 0 to prevent NaN
      await mongoose.model('ThemeCache').findByIdAndUpdate(doc.themeId, { 
        $inc: { [field]: 1 } 
      })
      
      // Find the entry that was watched
      const entry = theme.entries.find((e: any) => e.atEntryId === doc.atEntryId) || theme.entries[0]
      const entryDuration = Number(entry?.duration) || 90
      
      console.log(`[WatchHistory Hook] Found entry with duration: ${entryDuration}s. Incrementing User ${doc.userId} totalTime.`)
      
      // Explicitly find and atomic increment user to avoid missing doc
      // Using $inc on a missing field initializes it, but we can also use $setOnInsert or similar if we wanted, 
      // but standard $inc is usually safe.
      const updatedUser = await mongoose.model('User').findByIdAndUpdate(doc.userId, { 
        $inc: { totalTime: entryDuration } 
      }, { new: true, upsert: false })
      
      if (updatedUser) {
        console.log(`[WatchHistory Hook] User totalTime successful. Old + ${entryDuration} = ${updatedUser.totalTime}s`)
      } else {
        console.error(`[WatchHistory Hook] User ${doc.userId} not found during time update!`)
      }
    } else {
      console.warn(`[WatchHistory Hook] Theme not found for ID: ${doc.themeId}`)
    }
  } catch (err) {
    console.error(`[WatchHistory Hook] Error in post-save:`, err)
  }
})

export const WatchHistory = mongoose.models.WatchHistory || mongoose.model('WatchHistory', WatchHistorySchema)

const FollowSchema = new Schema({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true })
FollowSchema.index({ followerId: 1 })
FollowSchema.index({ followeeId: 1 })

FollowSchema.post('save', async function () {
  await mongoose.model('User').findByIdAndUpdate(this.followerId, { $inc: { totalFollowing: 1 } })
  await mongoose.model('User').findByIdAndUpdate(this.followeeId, { $inc: { totalFollowers: 1 } })
})

FollowSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return
  await mongoose.model('User').findByIdAndUpdate(doc.followerId, { $inc: { totalFollowing: -1 } })
  await mongoose.model('User').findByIdAndUpdate(doc.followeeId, { $inc: { totalFollowers: -1 } })
})

export const Follow = mongoose.models.Follow || mongoose.model('Follow', FollowSchema)

const FriendshipSchema = new Schema({
  requesterId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  addresseeId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['pending','accepted','blocked'], default: 'pending' },
  blockerId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true })
FriendshipSchema.index({ addresseeId: 1, status: 1 })
FriendshipSchema.index({ requesterId: 1, status: 1 })

export const Friendship = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema)

const FavoriteSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  themeId:   { type: Schema.Types.ObjectId, ref: 'ThemeCache', required: true },
  themeSlug: { type: String, required: true },
}, { timestamps: true })

FavoriteSchema.index({ userId: 1, themeId: 1 }, { unique: true })
FavoriteSchema.index({ userId: 1 })

export const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', FavoriteSchema)

const NotificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'friend_request',
      'friend_accepted',
      'friend_rated',
      'friend_favorited',
      'follow',
    ],
    required: true,
  },
  entityId:   { type: Schema.Types.ObjectId, default: null },
  entityMeta: { type: Schema.Types.Mixed, default: null },
  read:       { type: Boolean, default: false },
}, { timestamps: true })

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 })
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)

const SearchCacheSchema = new Schema({
  query:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  embedding: { type: [Number], required: true },
  hitCount:  { type: Number, default: 1 },
}, { timestamps: true })

SearchCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

export const SearchCache = mongoose.models.SearchCache || mongoose.model('SearchCache', SearchCacheSchema)

const QuizAttemptSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
  themeSlug:    { type: String, required: true },
  atEntryId:    { type: Number, required: true },
  quizType:     { type: String, enum: ['title','artist','anime'], required: true },
  correct:      { type: Boolean, required: true },
  timeTaken:    { type: Number, required: true },
  score:        { type: Number, required: true },
  streak:       { type: Number, default: 0 },
}, { timestamps: true })

QuizAttemptSchema.index({ userId: 1, createdAt: -1 })
QuizAttemptSchema.index({ themeSlug: 1 })
QuizAttemptSchema.index({ score: -1 })

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema)
