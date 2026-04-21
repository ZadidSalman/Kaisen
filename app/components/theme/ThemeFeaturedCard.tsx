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
      flex-shrink-0 relative overflow-hidden rounded-[20px]
      w-40 md:w-48 aspect-[10/14]
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute top-3 left-3 flex items-center gap-1
                      bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
        <span className="text-xs font-mono font-bold text-white">{avgRating?.toFixed(1) ?? '—'}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-display font-bold text-white truncate">{animeDisplayTitle}</p>
        <p className="text-xs font-body text-white/70 truncate">{animeStudios?.[0] ?? 'Unknown Studio'}</p>
      </div>
    </Link>
  )
}
