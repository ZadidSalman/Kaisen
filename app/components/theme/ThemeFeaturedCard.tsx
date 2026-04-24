'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { IThemeCache } from '@/types/app.types'
import { getFallbackImage, getAnimeTitle } from '@/lib/utils'

export function ThemeFeaturedCard({ theme, priority = false }: { theme: Partial<IThemeCache>, priority?: boolean }) {
  const {
    slug,
    animeCoverImage,
    animeGrillImage,
    avgRating,
    animeStudios,
  } = theme
  const animeDisplayTitle = getAnimeTitle(theme)
  const fallback = getFallbackImage(slug || animeDisplayTitle || undefined)
  
  return (
    <Link href={`/theme/${slug}`} className="
      flex-shrink-0 relative overflow-hidden rounded-[24px]
      w-[160px] md:w-[200px] aspect-[3/4]
      interactive cursor-pointer
      bg-bg-surface shadow-card
    ">
      <Image
        src={animeCoverImage ?? animeGrillImage ?? fallback}
        fill
        className="object-cover"
        alt={animeDisplayTitle ?? 'Anime featured image'}
        referrerPolicy="no-referrer"
        priority={priority}
      />
      {/* Dark gradient at the bottom for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Label Container */}
        <div className="inline-block px-3 py-1 rounded-md bg-black/60 backdrop-blur-sm mb-2">
          <p className="text-[9px] font-display font-bold text-white uppercase tracking-widest leading-none">
            {theme.animeSeason || 'SPRING'} &apos;{String(theme.animeSeasonYear || '24').slice(-2)} {theme.type || 'OP'}
          </p>
        </div>
        <p className="text-base font-display font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
          {theme.songTitle || animeDisplayTitle || 'Unknown Title'}
        </p>
      </div>
    </Link>
  )
}
