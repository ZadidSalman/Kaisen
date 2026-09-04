'use client'
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX } from 'lucide-react'
import { usePlayer } from '@/app/context/PlayerContext'
import { motion, AnimatePresence } from 'motion/react'
import { getAnimeTitle, getSongTitle, getFallbackImage } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function MiniPlayer() {
  const { currentTheme, isPlaying, togglePlay, next, previous, setIsPlaying, closePlayer } = usePlayer()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const hasLoggedView = useRef(false)

  const themeSlug = currentTheme?.slug
  const atEntryId = useMemo(() => {
    if (!currentTheme) return null
    return currentTheme.entries?.find(e => e.version === 'Standard')?.atEntryId || currentTheme.entries?.[0]?.atEntryId
  }, [currentTheme])

  const audioUrl = useMemo(() => {
    if (!currentTheme) return null
    const entry = currentTheme.entries?.find(e => e.version === 'Standard') || currentTheme.entries?.[0]
    return entry?.audioUrl || entry?.videoUrl || (currentTheme as any).audioUrl || (currentTheme as any).videoUrl || null
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
    } catch {
      hasLoggedView.current = false
    }
  }, [themeSlug, atEntryId])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Playback error:', err)
            setIsPlaying(false)
          })
        }
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
      const cur = audioRef.current.currentTime || 0
      const dur = audioRef.current.duration || 0
      setCurrentTime(cur)
      setDuration(dur)
      const p = dur > 0 ? (cur / dur) * 100 : 0
      setProgress(p)
      if (p >= 10 && !hasLoggedView.current) {
        logView()
      }
    }
  }

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
      setCurrentTime(0)
      setProgress(0)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || !duration) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    audioRef.current.currentTime = percent * duration
    setProgress(percent * 100)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  if (!currentTheme || !audioUrl) return null

  const animeTitle = getAnimeTitle(currentTheme)
  const songTitle = getSongTitle(currentTheme)
  const poster = currentTheme.animeCoverImage || getFallbackImage(currentTheme.slug)

  return (
    <AnimatePresence>
      <motion.div 
        key="mini-player-bar"
        id="mini-player-bar"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="fixed bottom-20 md:bottom-3 inset-x-0 md:left-24 md:right-6 z-50 px-3 md:px-4 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto w-full bg-white/95 dark:bg-[#201A1D]/95 backdrop-blur-xl border border-pink-100 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] rounded-2xl p-2.5 md:p-3 pointer-events-auto flex items-center gap-3 md:gap-5 relative overflow-hidden group">
          
          {/* Seekable Progress bar */}
          <div 
            ref={progressBarRef}
            onClick={handleSeek}
            className="absolute top-0 left-0 right-0 h-1.5 bg-pink-100 dark:bg-white/10 cursor-pointer group/progress transition-all hover:h-2.5 z-20"
          >
            <div 
              className="h-full bg-accent relative transition-all duration-150" 
              style={{ width: `${progress}%` }} 
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
            </div>
          </div>

          <audio 
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={next}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Album Cover & Track Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link 
              href={`/theme/${currentTheme.slug}`}
              className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-bg-elevated shadow-sm group/art block"
            >
              <Image 
                src={poster} 
                fill 
                className="object-cover group-hover/art:scale-105 transition-transform" 
                alt="poster" 
                referrerPolicy="no-referrer" 
              />
              {/* Equalizer overlay when playing */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <motion.div animate={{ height: [3, 12, 6, 14] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
                  <motion.div animate={{ height: [10, 4, 14, 6] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
                  <motion.div animate={{ height: [6, 14, 4, 10] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link 
                href={`/theme/${currentTheme.slug}`} 
                className="block text-xs md:text-sm font-display font-bold text-ktext-primary truncate hover:text-accent transition-colors"
              >
                {songTitle}
              </Link>
              <p className="text-[11px] md:text-xs font-body text-ktext-secondary truncate">
                {currentTheme.artistName ? `${currentTheme.artistName} • ` : ''}{animeTitle}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 md:gap-3">
            <button 
              id="mini-player-prev-btn"
              onClick={previous} 
              aria-label="Previous track"
              className="p-2 text-ktext-secondary hover:text-accent interactive rounded-full transition-colors"
            >
              <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            </button>
            
            <button 
              id="mini-player-play-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-md shadow-accent/25 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
              )}
            </button>

            <button 
              id="mini-player-next-btn"
              onClick={next} 
              aria-label="Next track"
              className="p-2 text-ktext-secondary hover:text-accent interactive rounded-full transition-colors"
            >
              <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            </button>
          </div>

          {/* Time & Volume Controls */}
          <div className="hidden sm:flex items-center gap-3 border-l border-border-subtle pl-4">
            <span className="text-[11px] font-mono text-ktext-tertiary tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button 
              id="mini-player-mute-btn"
              onClick={toggleMute} 
              aria-label="Toggle mute"
              className="p-1.5 text-ktext-tertiary hover:text-ktext-primary rounded-full transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-error" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Close / Dismiss Player Button */}
          <button 
            id="mini-player-close-btn"
            onClick={closePlayer} 
            aria-label="Close player"
            className="p-1.5 text-ktext-tertiary hover:text-ktext-primary interactive rounded-full transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  )
}
