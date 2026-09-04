'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Pause, Heart } from 'lucide-react'
import { getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'
import { usePlayer } from '@/app/context/PlayerContext'
import { motion } from 'motion/react'

interface ThemeLibraryRowProps {
  theme: any
  index?: number
  isFavorite?: boolean
  playlist?: any[]
}

export function ThemeLibraryRow({ theme, index = 0, isFavorite = false, playlist }: ThemeLibraryRowProps) {
  const { currentTheme, isPlaying, playTheme, togglePlay } = usePlayer()

  const songTitle = getSongTitle(theme)
  const animeTitle = getAnimeTitle(theme)
  const fallback = getFallbackImage(theme.slug || animeTitle || undefined)

  const isCurrentTheme = Boolean(
    (currentTheme?.slug && theme?.slug && currentTheme.slug === theme.slug) ||
    (currentTheme?._id && theme?._id && String(currentTheme._id) === String(theme._id))
  )
  const isRowPlaying = isCurrentTheme && isPlaying

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isCurrentTheme) {
      togglePlay()
    } else {
      playTheme(theme, playlist)
    }
  }

  return (
    <Link 
      href={`/theme/${theme.slug}`} 
      className={`group relative flex items-center gap-3.5 p-2 pr-3.5 rounded-2xl md:rounded-[28px] transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        isCurrentTheme
          ? 'bg-accent/10 dark:bg-accent/20 border border-accent/30 ring-1 ring-accent/20' 
          : 'bg-[#F2DEE4] dark:bg-bg-toast hover:bg-[#ebd3db] dark:hover:bg-white/10'
      }`}
    >
      {/* Favorite Accent Bar */}
      {isFavorite && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent" />
      )}

      {/* Album Artwork & Play State Visualizer */}
      <div className={`w-[52px] h-[52px] md:w-[56px] md:h-[56px] flex-shrink-0 rounded-xl md:rounded-full overflow-hidden bg-bg-elevated relative ${isFavorite ? 'ml-1' : ''}`}>
        <Image 
          src={theme.animeCoverImage || fallback} 
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500" 
          alt={animeTitle ?? 'Cover'} 
          referrerPolicy="no-referrer"
        />

        {/* Animated Sound Wave Equalizer Overlay when active */}
        {isRowPlaying && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-0.5">
            <motion.div animate={{ height: [3, 12, 5, 14] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
            <motion.div animate={{ height: [10, 4, 13, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
            <motion.div animate={{ height: [5, 13, 4, 11] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Track Metadata */}
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-display font-bold truncate transition-colors ${
          isCurrentTheme ? 'text-accent' : 'text-[#2D1420] dark:text-white group-hover:text-accent'
        }`}>
          {songTitle}
        </p>
        <p className="text-[13px] font-body text-[#986985] dark:text-ktext-tertiary truncate">
          {theme.artistName ? `${theme.artistName} • ` : ''}{animeTitle}
        </p>
      </div>

      {/* Right Actions: Favorite Badge & Spotify-style Play Button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isFavorite && (
          <Heart className="w-4 h-4 text-accent fill-accent flex-shrink-0" />
        )}

        {/* Play/Pause Button */}
        <button
          id={`play-btn-${theme.slug || index}`}
          type="button"
          onClick={handlePlayClick}
          aria-label={isRowPlaying ? `Pause ${songTitle}` : `Play ${songTitle}`}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
            isRowPlaying
              ? 'bg-accent text-white scale-105 shadow-accent/30'
              : 'bg-accent/15 dark:bg-white/10 text-accent group-hover:bg-accent group-hover:text-white group-hover:scale-105 active:scale-95'
          }`}
        >
          {isRowPlaying ? (
            <Pause className="w-4 h-4 fill-current text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5 transition-colors" />
          )}
        </button>
      </div>
    </Link>
  )
}
