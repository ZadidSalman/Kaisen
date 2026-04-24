'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Heart, MoreVertical } from 'lucide-react'
import { IThemeCache } from '@/types/app.types'
import { getScoreColor, getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'
import { usePlayer } from '@/app/context/PlayerContext'

interface ThemeListRowProps extends Partial<IThemeCache> {
  friendUsername?: string
  friendScore?: number
  isWatched?: boolean
}

export function ThemeListRow(props: ThemeListRowProps) {
  const { currentTheme, isPlaying, playTheme, togglePlay } = usePlayer()
  const {
    slug,
    artistName,
    animeCoverImage,
  } = props
  const animeDisplayTitle = getAnimeTitle(props)
  const songDisplayTitle = getSongTitle(props)
  const fallback = getFallbackImage(slug || animeDisplayTitle || undefined)

  // Use a mock liked state for visual match, or integrate real later
  const [isLiked, setIsLiked] = useState(false)

  return (
    <Link href={`/theme/${slug}`} className="
      flex items-center gap-3 p-2 sm:p-3
      bg-accent-container rounded-3xl
      shadow-sm interactive cursor-pointer
      transition-all duration-200 hover:shadow-md
    ">
      <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-[18px] overflow-hidden bg-bg-elevated relative">
        <Image 
          src={animeCoverImage || fallback} 
          fill
          className="object-cover" 
          alt={animeDisplayTitle ?? 'Anime cover'} 
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-display font-bold text-ktext-primary truncate">{songDisplayTitle}</p>
        <p className="text-xs sm:text-sm font-body text-ktext-secondary truncate">
          {artistName || animeDisplayTitle}
        </p>
      </div>
      <div className="flex items-center gap-2 pr-2">
        <button 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsLiked(!isLiked)
          }}
          className="p-2 rounded-full interactive transition-colors"
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-accent text-accent' : 'text-ktext-secondary fill-ktext-secondary'}`} />
        </button>
        <button 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className="p-1 rounded-full interactive text-ktext-secondary"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </Link>
  )
}
