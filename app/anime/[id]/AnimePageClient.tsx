'use client'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Play, Heart, MoreHorizontal, Calendar, Music, Star, ChevronRight } from 'lucide-react'
import { getAnimeTitleFromCache } from '@/lib/utils'
import { RelatedAnime } from './RelatedAnime'
import Link from 'next/link'
import { usePlayer } from '@/app/context/PlayerContext'
import { useRouter } from 'next/navigation'

interface AnimePageClientProps {
  anime: any
  themes: any[]
}

export default function AnimePageClient({ anime, themes }: AnimePageClientProps) {
  const { playTheme, currentTheme, isPlaying } = usePlayer()
  const router = useRouter()
  const animeDisplayTitle = getAnimeTitleFromCache(anime)

  const handlePlay = (e: React.MouseEvent, theme: any) => {
    e.stopPropagation()
    playTheme(theme, themes)
  }

  const handleCardClick = (slug: string) => {
    router.push(`/theme/${slug}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f4f6] via-[#f9fafb] to-white text-ktext-primary">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Anime Artwork Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src={anime.atGrillImage || anime.bannerImage || anime.coverImageLarge || 'https://picsum.photos/seed/anime/1920/1080'}
            fill
            className="object-cover opacity-[0.12] blur-[1px]"
            alt="background"
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f3f4f6]/40 via-transparent to-white" />
        </div>

        {/* Large Faded Title Background */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[12vw] font-display font-black text-black/[0.05] whitespace-nowrap pointer-events-none select-none italic z-10">
          {animeDisplayTitle}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 flex flex-col items-center max-w-2xl"
        >
          <span className="px-4 py-1.5 bg-[#fce7f3] text-[#be185d] text-[10px] font-bold rounded-full uppercase tracking-widest mb-6 shadow-sm">
            Anime OST
          </span>

          <h1 className="text-5xl md:text-6xl font-display font-bold text-[#1f2937] mb-6 tracking-tight drop-shadow-sm">
            {animeDisplayTitle}
          </h1>

          <p className="text-base text-[#4b5563] font-medium leading-relaxed mb-8 max-w-xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {anime.description || `The complete official soundtrack for ${animeDisplayTitle}. Featuring the chart-topping opening and emotional ending themes.`}
          </p>

          {/* Progress Indicator (Decorative like screenshot) */}
          <div className="flex gap-1 w-48 h-1 mb-10">
            <div className="flex-1 bg-accent rounded-full" />
            <div className="flex-1 bg-white rounded-full shadow-sm" />
            <div className="flex-1 bg-white rounded-full shadow-sm" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => themes[0] && handlePlay(e as any, themes[0])}
              className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20"
            >
              <Play className="w-6 h-6 fill-current ml-1" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white text-accent flex items-center justify-center shadow-md border border-pink-100"
            >
              <Heart className="w-5 h-5" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-full bg-white text-gray-400 flex items-center justify-center shadow-md border border-gray-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Song List */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6 px-4">
          <span className="w-12 text-center">#</span>
          <span>Title</span>
        </div>

        <div className="space-y-2">
          {themes.map((theme, index) => {
            const isCurrentlyPlaying = currentTheme?._id === theme._id
            const isActive = isCurrentlyPlaying
            
            return (
              <motion.div
                key={theme._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCardClick(theme.slug)}
                className={`group relative flex items-center p-4 rounded-3xl cursor-pointer transition-all duration-300
                           ${isActive ? 'bg-white shadow-xl shadow-pink-500/5 ring-1 ring-pink-100' : 'hover:bg-white/50'}`}
              >
                {/* Index / Equalizer */}
                <div className="w-12 flex justify-center items-center">
                  {isCurrentlyPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                      <motion.div animate={{ height: isPlaying ? [4, 12, 6, 10] : 4 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-accent rounded-full" />
                      <motion.div animate={{ height: isPlaying ? [8, 4, 12, 7] : 6 }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-accent rounded-full" />
                      <motion.div animate={{ height: isPlaying ? [12, 6, 10, 4] : 3 }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-accent rounded-full" />
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 shadow-inner bg-gray-100">
                  <Image
                    src={theme.themeEntryCover || theme.animeCoverImage || 'https://picsum.photos/seed/song/100/100'}
                    fill
                    className="object-cover"
                    alt={theme.themeName}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-800 group-hover:text-accent transition-colors truncate">
                      {theme.songTitle || theme.themeName}
                    </span>
                    <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 bg-pink-50 rounded uppercase">
                      {theme.themeType || theme.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium truncate">
                    {theme.artistName || 'Unknown Artist'}
                  </p>
                </div>

                {/* Play Button Overlay on Hover */}
                {!isActive && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute right-8"
                    onClick={(e) => handlePlay(e, theme)}
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 hover:bg-accent hover:text-white flex items-center justify-center text-accent transition-all">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </motion.div>
                )}
                
                {isActive && (
                  <ChevronRight className="w-5 h-5 text-pink-200 ml-4" />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer Info / Related */}
      <div className="max-w-4xl mx-auto px-6 pb-20 border-t border-gray-100 pt-12 mt-12">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Related Series</h3>
        <RelatedAnime animeId={anime.anilistId} />
      </div>
    </div>
  )
}
