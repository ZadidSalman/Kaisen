'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Play, Eye } from 'lucide-react'
import { IThemeCache } from '@/types/app.types'
import { getScoreColor, getFallbackImage } from '@/lib/utils'

interface ThemeListRowProps extends Partial<IThemeCache> {
  friendUsername?: string
  friendScore?: number
  isWatched?: boolean
}

export function ThemeListRow({
  slug,
  songTitle,
  artistName,
  animeTitle,
  animeCoverImage,
  type,
  sequence,
  avgRating,
  totalRatings,
  friendUsername,
  friendScore,
  isWatched,
}: ThemeListRowProps) {
  const fallback = getFallbackImage(slug || animeTitle || undefined)

  return (
    <Link href={`/theme/${slug}`} className="
      flex items-center gap-3 p-3
      bg-bg-surface rounded-[16px]
      border border-border-subtle
      shadow-card interactive cursor-pointer
      transition-all duration-200 hover:shadow-card-hover hover:border-border-default
      relative
    ">
      {isWatched && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-mint shadow-[0_0_8px_rgba(var(--accent-mint-rgb),0.6)]" title="Watched" />
      )}
      <div className="w-16 h-16 flex-shrink-0 rounded-[12px] overflow-hidden bg-bg-elevated relative">
        <Image 
          src={animeCoverImage || fallback} 
          fill
          className="object-cover" 
          alt={animeTitle ?? 'Anime cover'} 
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`
            text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full
            ${type === 'OP'
              ? 'bg-accent-container text-accent'
              : 'bg-accent-ed-container text-accent-ed'
            }
          `}>
            {type}{sequence}
          </span>
        </div>
        <p className="text-sm font-body font-semibold text-ktext-primary truncate">{songTitle}</p>
        <p className="text-xs font-body text-ktext-secondary truncate">
          {artistName} · {animeTitle}
        </p>
        {friendUsername && (
          <p className="text-xs font-body text-accent truncate">
            @{friendUsername} rated {friendScore}/10
          </p>
        )}
        {!friendUsername && (
          <div className="flex items-center gap-2 pt-0.5">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-mono font-bold text-ktext-secondary">
              {avgRating?.toFixed(1) ?? '—'}
            </span>
            <span className="text-xs text-ktext-tertiary">({totalRatings ?? 0})</span>
          </div>
        )}
      </div>
      <div className="w-9 h-9 rounded-full bg-accent-container
                         flex items-center justify-center flex-shrink-0 interactive">
        <Play className="w-4 h-4 text-accent" />
      </div>
    </Link>
  )
}
