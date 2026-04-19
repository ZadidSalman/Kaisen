import 'dotenv/config'
import { connectDB } from '../lib/db.ts'
import { ThemeCache, ArtistCache } from '../lib/models/index.ts'
import {
  log, logSeparator, delay, AT_DELAY_MS,
  fetchATThemesByIds, parseATTheme, loadProgress,
} from './seed-utils.ts'

const AT_INCLUDE = 'animethemeentries.videos,anime.images,song.artists'

async function fixArtists() {
  await connectDB()
  logSeparator('FIXING MISSING ARTISTS')

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const themesToFix = await ThemeCache.find({
    $or: [
      { artistName: null },
      { artistName: "" },
      { allArtists: { $size: 0 } }
    ],
    syncedAt: { $lt: oneDayAgo }
  }).select('animethemesId').limit(100).lean()

  if (themesToFix.length === 0) {
    log('INFO', 'FIX', 'No themes found missing artist info.')
    process.exit(0)
  }

  log('INFO', 'FIX', `Found ${themesToFix.length} themes to fix.`)

  const ids = themesToFix.map(t => t.animethemesId)
  const batchSize = 50
  const dummyProgress = loadProgress('dummy') // Just for enrichTheme if needed, but we might skip enrichment to be fast

  for (const theme of themesToFix) {
    log('INFO', 'FIX', `Processing theme ${theme.animethemesId}...`)

    try {
      await delay(AT_DELAY_MS)
      const url = `https://api.animethemes.moe/animetheme/${theme.animethemesId}?include=${AT_INCLUDE}`
      const res = await fetch(url, { headers: { 'User-Agent': 'Kaikansen/1.0.0' } })
      if (!res.ok) {
        log('ERROR', 'FIX', `  ✗ Failed to fetch theme ${theme.animethemesId}: HTTP ${res.status}`)
        continue
      }
      const data = await res.json()
      const atTheme = data.animetheme

      const parsed = parseATTheme(atTheme)
      if (!parsed) {
        log('WARN', 'FIX', `  ✗ Could not parse theme ${atTheme.id}`)
        continue
      }

      // We only want to update artist fields
      await ThemeCache.findOneAndUpdate(
        { animethemesId: atTheme.id },
        { 
          $set: {
            artistName:  parsed.artistName,
            allArtists:  parsed.allArtists,
            artistSlugs: parsed.artistSlugs,
            artistRoles: parsed.artistRoles,
            syncedAt:    new Date()
          }
        }
      )

      // Also update ArtistCache
      const artists = atTheme.song?.artists ?? []
      for (const artist of artists) {
        if (!artist.slug) continue
        const artistImageUrl = artist.images?.[0]?.link ?? null
        await ArtistCache.findOneAndUpdate(
          { slug: artist.slug },
          {
            $set: {
              slug:          artist.slug,
              animethemesId: artist.id,
              name:          artist.name,
              aliases:       artist.aliases ?? [],
              imageUrl:      artistImageUrl,
              syncedAt:      new Date(),
            }
          },
          { upsert: true }
        )
      }
      log('SUCCESS', 'FIX', `  ✓ Updated artist info for: ${parsed.songTitle} (${atTheme.id})`)
    } catch (err) {
      log('ERROR', 'FIX', `  ✗ Failed to process theme ${theme.animethemesId}: ${err}`)
    }
  }

  logSeparator('FIX COMPLETE')
  process.exit(0)
}

fixArtists()
