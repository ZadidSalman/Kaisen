import 'dotenv/config'
import fs from 'fs'
import { connectDB } from '../lib/db.ts'
import { ThemeCache, ArtistCache, AnimeCache } from '../lib/models/index.ts'
import {
  log, logSeparator, loadProgress, saveProgress, delay,
  AT_DELAY_MS, fetchATPage, fetchATResourcePage, parseATTheme, enrichTheme,
} from './seed-utils.ts'
import type { SeedProgress } from './seed-utils.ts'
import path from 'path'

const AT_INCLUDE = 'animethemeentries.videos,anime.images,song.artists'

export async function runSeedForFilter(
  progressFile: string,
  label: string,
  filterFn: (atAnime: any) => boolean,
  apiFilter?: string,
) {
  await connectDB()
  logSeparator(`SEED: ${label}`)

  const progress = loadProgress(progressFile)
  log('INFO', 'SEED', `Resuming from page ${progress.lastCompletedPage + 1}`)
  log('INFO', 'SEED', `Stats so far: ${progress.totalProcessed} processed, ${progress.totalErrors} errors`)

  let page = progress.lastCompletedPage + 1
  let hasMore = true

  while (hasMore) {
    log('INFO', 'SEED', `Page ${page} starting...`)

    let pageData: any
    try {
      await delay(AT_DELAY_MS)
      pageData = await fetchATPage(page, AT_INCLUDE, apiFilter)
    } catch (err) {
      log('ERROR', 'SEED', `Page ${page} fetch failed: ${err} — retrying in 5s`)
      await delay(5000)
      try {
        pageData = await fetchATPage(page, AT_INCLUDE)
      } catch (retryErr) {
        log('ERROR', 'SEED', `Page ${page} retry also failed: ${retryErr} — skipping page`)
        progress.totalErrors++
        saveProgress(progressFile, progress)
        page++
        continue
      }
    }

    const themes = pageData.animethemes ?? []
    if (themes.length === 0) {
      log('INFO', 'SEED', `No more themes found at page ${page}.`)
      hasMore = false
      break
    }

    log('INFO', 'SEED', `Page ${page}: ${themes.length} themes found`)

    for (let i = 0; i < themes.length; i++) {
      const atTheme = themes[i]
      const atAnime = atTheme.anime

      if (!filterFn(atAnime)) continue

      const themeLabel = `"${atTheme.song?.title ?? 'Unknown'}" (${atTheme.type}${atTheme.sequence}) [${atAnime?.name}]`
      log('INFO', 'SEED', `  Theme ${i + 1}/${themes.length}: ${themeLabel}`)

      try {
        const parsed = parseATTheme(atTheme)
        if (!parsed) {
          log('WARN', 'SEED', `  ✗ Skipped: could not parse`)
          progress.totalErrors++
          continue
        }

        if (parsed._nullAudioCount > 0) {
          log('WARN', 'SEED', `  ⚠ ${parsed._nullAudioCount} entries have null audioUrl`)
          progress.nullAudioUrlCount += parsed._nullAudioCount
        }

        const enriched = await enrichTheme(parsed, atAnime, progress)

        await ThemeCache.findOneAndUpdate(
          { animethemesId: enriched.animethemesId },
          { $set: enriched },
          { upsert: true, new: true }
        )
        log('SUCCESS', 'SEED', `  ✓ Upserted ThemeCache: ${enriched.slug}`)

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

        if (enriched.anilistId) {
          await AnimeCache.findOneAndUpdate(
            { anilistId: enriched.anilistId },
            {
              $set: {
                anilistId:        enriched.anilistId,
                malId:            enriched.malId ?? null,
                kitsuId:          enriched.kitsuId,
                titleRomaji:      enriched.animeTitle,
                titleEnglish:     enriched.animeTitleEnglish,
                titleNative:      enriched.titleNative ?? null,
                titleAlternative: enriched.animeTitleAlternative,
                synonyms:         enriched.synonyms ?? [],
                season:           enriched.animeSeason,
                seasonYear:       enriched.animeSeasonYear,
                genres:                enriched.genres ?? [],
                totalEpisodes:         enriched.totalEpisodes ?? null,
                status:                enriched.animeStatus ?? null,
                averageScore:          enriched.averageScore ?? null,
                coverImageLarge:       enriched.coverImageLarge ?? null,
                bannerImage:           enriched.bannerImage ?? null,
                atCoverImage:          enriched.animeCoverImage,
                atGrillImage:          enriched.animeGrillImage,
                syncedAt:              new Date(),
              },
            },
            { upsert: true }
          )
        }

        progress.totalProcessed++
      } catch (err) {
        log('ERROR', 'SEED', `  ✗ Failed to process theme ${atTheme.id}: ${err}`)
        progress.totalErrors++
      }
    }

    progress.lastCompletedPage = page
    saveProgress(progressFile, progress)
    log('INFO', 'SEED', `Page ${page} complete. Total: ${progress.totalProcessed} processed, ${progress.totalErrors} errors`)
    page++
  }

  logSeparator(`SEED COMPLETE: ${label}`)
  log('INFO', 'SEED', `Total processed:      ${progress.totalProcessed}`)
  log('INFO', 'SEED', `Total errors:         ${progress.totalErrors}`)
  log('INFO', 'SEED', `Null audioUrl count:  ${progress.nullAudioUrlCount}`)
  log('INFO', 'SEED', `AniList fallbacks:    ${progress.anilistFallbacks}`)
  log('INFO', 'SEED', `Kitsu fallbacks:      ${progress.kitsuFallbacks}`)
  log('INFO', 'SEED', `Unknown (all failed): ${progress.unknownCount}`)
  log('INFO', 'SEED', `Log written to: scripts/seed.log`)
}

export async function runSeedByAnime(
  progressFile: string,
  label: string,
  apiFilter?: string,
) {
  await connectDB()
  logSeparator(`SEED BY ANIME: ${label}`)

  const progress = loadProgress(progressFile)
  log('INFO', 'SEED', `Resuming from page ${progress.lastCompletedPage + 1}`)
  log('INFO', 'SEED', `Stats so far: ${progress.totalProcessed} processed, ${progress.totalErrors} errors`)

  let page = progress.lastCompletedPage + 1
  let hasMore = true

  const ANIME_INCLUDE = 'images,studios,series,animethemes.animethemeentries.videos,animethemes.song.artists'

  while (hasMore) {
    log('INFO', 'SEED', `[${label}] Page ${page} starting (resource: anime)...`)

    if (fs.existsSync('STOP_SEED')) {
      log('WARN', 'SEED', 'STOP_SEED file detected. Exiting gracefully...')
      process.exit(0)
    }

    let pageData: any
    try {
      await delay(AT_DELAY_MS)
      pageData = await fetchATResourcePage('anime', page, ANIME_INCLUDE, apiFilter)
    } catch (err) {
      log('ERROR', 'SEED', `Page ${page} fetch failed: ${err} — retrying in 5s`)
      await delay(5000)
      try {
        pageData = await fetchATResourcePage('anime', page, ANIME_INCLUDE, apiFilter)
      } catch (retryErr) {
        log('ERROR', 'SEED', `Page ${page} retry also failed: ${retryErr} — skipping page`)
        progress.totalErrors++
        saveProgress(progressFile, progress)
        page++
        continue
      }
    }

    const animes = pageData.anime ?? []
    if (animes.length === 0) {
      log('INFO', 'SEED', `No more anime found at page ${page}.`)
      hasMore = false
      break
    }

    log('INFO', 'SEED', `Page ${page}: ${animes.length} anime found`)

    for (const atAnime of animes) {
      const themes = atAnime.animethemes ?? []
      if (themes.length === 0) continue

      for (const atTheme of themes) {
        // Inject anime into theme for parseATTheme
        atTheme.anime = atAnime

        const themeDoc = parseATTheme(atTheme)
        if (!themeDoc) {
          progress.totalErrors++
          continue
        }

        // Re-seed all to ensure images are updated
        // const existing = await ThemeCache.findOne({ animethemesId: themeDoc.animethemesId })
        // if (existing && existing.animeCoverImageSmall) {
        //   log('INFO', 'SEED', `  Skipping existing: ${themeDoc.animethemesId}`)
        //   progress.totalProcessed++
        //   continue
        // }

        // Enrich
        const enriched = await enrichTheme(themeDoc, atAnime, progress)
        if (!enriched) {
          progress.unknownCount++
        }

        // Save
        const finalDoc = enriched || themeDoc
        await ThemeCache.findOneAndUpdate(
          { animethemesId: finalDoc.animethemesId },
          { $set: finalDoc },
          { upsert: true, new: true }
        )
        progress.totalProcessed++
        if (themeDoc._nullAudioCount > 0) progress.nullAudioUrlCount += themeDoc._nullAudioCount
        log('SUCCESS', 'SEED', `  ✓ Upserted ThemeCache: ${themeDoc.slug}-${themeDoc.animethemesId}`)

        // Artists
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

        // Anime Cache
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
    }

    progress.lastCompletedPage = page
    saveProgress(progressFile, progress)
    log('INFO', 'SEED', `Page ${page} complete. Total: ${progress.totalProcessed} processed, ${progress.totalErrors} errors`)
    page++
  }

  logSeparator(`SEED COMPLETE: ${label}`)
  log('INFO', 'SEED', `Total processed:      ${progress.totalProcessed}`)
  log('INFO', 'SEED', `Total errors:         ${progress.totalErrors}`)
  log('INFO', 'SEED', `Null audioUrl count:  ${progress.nullAudioUrlCount}`)
  log('INFO', 'SEED', `AniList fallbacks:    ${progress.anilistFallbacks}`)
  log('INFO', 'SEED', `Kitsu fallbacks:      ${progress.kitsuFallbacks}`)
  log('INFO', 'SEED', `Unknown (all failed): ${progress.unknownCount}`)
  log('INFO', 'SEED', `Log written to: scripts/seed.log`)
}
