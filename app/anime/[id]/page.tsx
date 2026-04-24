import Image from 'next/image'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { AnimeCache, ThemeCache } from '@/lib/models'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { NavigationRail } from '@/app/components/layout/NavigationRail'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { ThemeFilterList } from '@/app/components/shared/ThemeFilterList'
import { Star, Calendar, Music } from 'lucide-react'
import { RelatedAnime } from './RelatedAnime'
import { getAnimeTitleFromCache } from '@/lib/utils'
import AnimePageClient from './AnimePageClient'


export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await connectDB()

  const animeId = parseInt(id)
  if (isNaN(animeId)) notFound()

  // Fetch both in parallel — AnimeCache may not exist if only ThemeCache was seeded
  const [animeFromCache, themes] = await Promise.all([
    AnimeCache.findOne({ anilistId: animeId }).lean(),
    ThemeCache.find({ anilistId: animeId }).lean(),
  ])

  // If there are no themes for this ID either, it truly doesn't exist
  if (!animeFromCache && themes.length === 0) notFound()

  // If AnimeCache is missing, synthesize a compatible shape from the first ThemeCache document.
  // ThemeCache already stores all the metadata we need to render the page.
  const anime = animeFromCache ?? (() => {
    const t = themes[0]
    return {
      anilistId:       animeId,
      titleRomaji:     t.animeTitle,
      titleEnglish:    t.animeTitleEnglish ?? null,
      titleNative:     null,
      season:          t.animeSeason ?? null,
      seasonYear:      t.animeSeasonYear ?? null,
      genres:          [],
      coverImageLarge: t.animeCoverImage ?? null,
      coverImageMedium:t.animeCoverImageSmall ?? null,
      bannerImage:     null,
      atCoverImage:    t.animeCoverImage ?? null,
      atGrillImage:    t.animeGrillImage ?? null,
      studios:         t.animeStudios ?? [],
      series:          t.animeSeries ?? [],
      averageScore:    null,
      totalEpisodes:   null,
      status:          null,
    }
  })()

  const animeDisplayTitle = getAnimeTitleFromCache(anime)

  // Convert to plain objects for client components
  const serializedAnime = JSON.parse(JSON.stringify(anime))
  const serializedThemes = JSON.parse(JSON.stringify(themes))

  return (
    <AnimePageClient 
      anime={serializedAnime} 
      themes={serializedThemes} 
    />
  )
}
