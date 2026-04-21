'use client'
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Pause, SkipBack, SkipForward, X, Volume2, ListMusic } from 'lucide-react'
import { usePlayer } from '@/app/context/PlayerContext'
import { motion, AnimatePresence } from 'motion/react'
import { getAnimeTitle, getSongTitle, getFallbackImage } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'

export function MiniPlayer() {
  const { currentTheme, isPlaying, togglePlay, next, previous, setIsPlaying } = usePlayer()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progress, setProgress] = useState(0)
  const hasLoggedView = useRef(false)

  const themeSlug = currentTheme?.slug
  const atEntryId = useMemo(() => {
    if (!currentTheme) return null
    return currentTheme.entries.find(e => e.version === 'Standard')?.atEntryId || currentTheme.entries[0]?.atEntryId
  }, [currentTheme])

  const audioUrl = useMemo(() => {
    if (!currentTheme) return null
    return currentTheme.entries.find(e => e.version === 'Standard')?.audioUrl || currentTheme.entries[0]?.audioUrl
  }, [currentTheme])

  const logView = useCallback(async () => {
    if (hasLoggedView.current || !themeSlug || !atEntryId) return
    hasLoggedView.current = true
    try {
      await authFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeSlug, atEntryId, mode: 'listen' }),
      })
    } catch (err) {
      hasLoggedView.current = false
    }
  }, [themeSlug, atEntryId])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, setIsPlaying, audioUrl])

  useEffect(() => {
    hasLoggedView.current = false
  }, [themeSlug])

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setProgress(p || 0)
      if (p >= 10 && !hasLoggedView.current) {
        logView()
      }
    }
  }

  if (!currentTheme || !audioUrl) return null

  const animeTitle = getAnimeTitle(currentTheme)
  const songTitle = getSongTitle(currentTheme)
  const poster = currentTheme.animeCoverImage || getFallbackImage(currentTheme.slug)

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-16 md:bottom-2 inset-x-0 md:left-24 md:right-4 z-50 px-4 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto w-full bg-bg-surface/95 backdrop-blur-md border border-border-default shadow-2xl rounded-2xl p-2 md:p-3 pointer-events-auto flex items-center gap-3 md:gap-6 relative overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-bg-elevated">
          <div 
            className="h-full bg-accent transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        <audio 
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={onTimeUpdate}
          onEnded={next}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 relative rounded-lg overflow-hidden flex-shrink-0 bg-bg-elevated shadow-sm">
            <Image src={poster} fill className="object-cover" alt="poster" referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/theme/${currentTheme.slug}`} className="block text-xs md:text-sm font-display font-bold text-ktext-primary truncate hover:text-accent transition-colors">
              {songTitle}
            </Link>
            <p className="text-[10px] md:text-xs font-body text-ktext-secondary truncate">
              {currentTheme.artistName} • {animeTitle}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-5">
          <button onClick={previous} className="p-2 text-ktext-secondary hover:text-accent interactive rounded-full transition-colors hidden sm:block">
            <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />}
          </button>

          <button onClick={next} className="p-2 text-ktext-secondary hover:text-accent interactive rounded-full transition-colors">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
        </div>

        {/* Desktop Volume/Extra */}
        <div className="hidden md:flex items-center gap-4 border-l border-border-subtle pl-6">
           <Volume2 className="w-4 h-4 text-ktext-tertiary" />
           <div className="w-20 lg:w-24 h-1 bg-bg-elevated rounded-full overflow-hidden relative group cursor-pointer">
              <div className="absolute inset-0 bg-accent w-2/3" />
           </div>
        </div>
      </div>
    </motion.div>
  )
}
