import 'dotenv/config'
import { connectDB } from '../lib/db.ts'
import { ThemeCache, ArtistCache, AnimeCache } from '../lib/models/index.ts'
import {
  log, logSeparator, loadProgress, saveProgress, delay,
  fetchATResourcePage, parseATTheme, enrichTheme, fetchAniList
} from './seed-utils.ts'
import path from 'path'

const ANILIST_DELAY_MS = 1000
const AT_DELAY_MS = 1000
const AT_INCLUDE = 'animethemes.animethemeentries.videos,images,studios,series,animethemes.song.artists'

async function fetchPopularAniList(page: number) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title { romaji english native }
        }
      }
    }
  `
  const data = await fetchAniList(query, { page, perPage: 50 })
  return data?.Page?.media ?? []
}

async function run() {
  await connectDB()
  logSeparator('SEED: Top 500 Popular Anime Themes')

  const progressFile = path.join(process.cwd(), 'scripts', 'progress-popular.json')
  const progress = loadProgress(progressFile)

  for (let page = 1; page <= 10; page++) { // 10 pages * 50 = 500
    if (page <= progress.lastCompletedPage) {
       log('INFO', 'SEED', `Skipping AniList Page ${page} (already completed)`)
       continue
    }

    log('INFO', 'SEED', `AniList Page ${page} starting...`)
    const popularAnime = await fetchPopularAniList(page)
    await delay(ANILIST_DELAY_MS)

    if (popularAnime.length === 0) {
      log('WARN', 'SEED', `No anime found on AniList page ${page}`)
      break
    }

    for (const anime of popularAnime) {
      const title = anime.title.romaji || anime.title.english
      log('INFO', 'SEED', `Searching AT for: ${title}`)

      try {
        // Search AT by title
        const atRes = await fetchATResourcePage('anime', 1, AT_INCLUDE, `filter[name]=${encodeURIComponent(title)}`)
        await delay(AT_DELAY_MS)

        const atAnimes = atRes.anime ?? []
        if (atAnimes.length === 0) {
          log('WARN', 'SEED', `  ✗ No match on AT for: ${title}`)
          continue
        }

        // Use the best match (usually the first one)
        const atAnime = atAnimes[0]
        const themes = atAnime.animethemes ?? []

        for (const atTheme of themes) {
          atTheme.anime = atAnime
          const themeDoc = parseATTheme(atTheme)
          if (!themeDoc) continue

          const enriched = await enrichTheme(themeDoc, atAnime, progress)
          const finalDoc = enriched || themeDoc

          // Save Theme
          await ThemeCache.findOneAndUpdate(
            { animethemesId: finalDoc.animethemesId },
            { $set: finalDoc },
            { upsert: true, new: true }
          )
          progress.totalProcessed++
          log('SUCCESS', 'SEED', `  ✓ Upserted Theme: ${finalDoc.slug}`)

          // Save Artists
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
                },
                $inc: { totalThemes: 1 },
              },
              { upsert: true }
            )
          }

          // Save Anime Cache
          if (finalDoc.anilistId) {
            await AnimeCache.findOneAndUpdate(
              { anilistId: finalDoc.anilistId },
              {
                $set: {
                  anilistId:        finalDoc.anilistId,
                  malId:            finalDoc.malId ?? null,
                  kitsuId:          finalDoc.kitsuId,
                  titleRomaji:      finalDoc.animeTitle,
                  titleEnglish:     finalDoc.animeTitleEnglish,
                  titleNative:      finalDoc.titleNative ?? null,
                  titleAlternative: finalDoc.animeTitleAlternative,
                  synonyms:         finalDoc.synonyms ?? [],
                  season:           finalDoc.animeSeason,
                  seasonYear:       finalDoc.animeSeasonYear,
                  genres:                finalDoc.genres ?? [],
                  totalEpisodes:         finalDoc.totalEpisodes ?? null,
                  status:                finalDoc.animeStatus ?? null,
                  averageScore:          finalDoc.averageScore ?? null,
                  coverImageLarge:       finalDoc.coverImageLarge ?? null,
                  coverImageMedium:      finalDoc.coverImageMedium ?? null,
                  bannerImage:           finalDoc.bannerImage ?? null,
                  atCoverImage:          finalDoc.animeCoverImage,
                  atGrillImage:          finalDoc.animeGrillImage,
                  studios:               finalDoc.animeStudios,
                  series:                finalDoc.animeSeries,
                  syncedAt:              new Date(),
                },
              },
              { upsert: true }
            )
          }
        }
      } catch (err) {
        log('ERROR', 'SEED', `  ✗ Error processing ${title}: ${err}`)
      }
    }

    progress.lastCompletedPage = page
    saveProgress(progressFile, progress)
  }

  log('INFO', 'SEED', 'Finished seeding top 500 popular anime themes.')
}

run().then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
