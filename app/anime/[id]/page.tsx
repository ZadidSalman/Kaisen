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
    <div className="space-y-8 mt-4">
      {/* Hero Section */}
      <div className="relative h-[250px] md:h-[350px] rounded-[32px] overflow-hidden group shadow-2xl">
        <Image 
          src={anime.atGrillImage || anime.bannerImage || anime.coverImageLarge || 'https://picsum.photos/seed/anime/1920/1080'}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          alt={animeDisplayTitle}
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row md:items-end gap-6">
          <div className="w-24 md:w-32 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 flex-shrink-0">
            <Image 
              src={anime.atCoverImage || anime.coverImageLarge || 'https://picsum.photos/seed/cover/200/300'}
              fill
              className="object-cover"
              alt="cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 leading-tight">
              {animeDisplayTitle}
            </h1>
            {anime.titleEnglish && anime.titleRomaji && anime.titleEnglish !== anime.titleRomaji && (
              <p className="text-sm font-body text-white/60 mb-2 italic">
                {anime.titleRomaji}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-white/80 text-sm font-body">
              {anime.season && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent-mint" />
                  <span>{anime.season} {anime.seasonYear}</span>
                </div>
              )}
              {anime.averageScore && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span>{anime.averageScore}%</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-accent" />
                <span>{themes.length} Themes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2">
          <ThemeFilterList themes={serializedThemes} />
        </div>

        <div className="space-y-6">
          <div className="bg-bg-surface rounded-[24px] p-6 border border-border-subtle shadow-card">
            <h3 className="text-sm font-body font-bold text-accent uppercase tracking-wider mb-4">Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono font-bold text-ktext-tertiary uppercase mb-1">Studios</p>
                <p className="text-sm font-body text-ktext-primary">{anime.studios?.join(', ') || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-ktext-tertiary uppercase mb-1">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {anime.genres?.map((genre: string) => (
                    <span key={genre} className="px-2 py-0.5 bg-bg-elevated rounded-full text-[10px] font-body font-semibold text-ktext-secondary border border-border-subtle">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RelatedAnime animeId={animeId} />
    </div>
  )
}
