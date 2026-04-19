'use client'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Plyr } from 'plyr-react'
import 'plyr-react/plyr.css'
import { authFetch } from '@/lib/auth-client'
import { Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

interface VideoPlayerProps {
  videoSources: { resolution: number; url: string }[]
  audioUrl?: string | null
  poster?: string
  mode: 'watch' | 'listen'
  themeSlug: string
  atEntryId: number
  onWatched?: () => void
  autoPlay?: boolean
}

export function VideoPlayer({ videoSources, audioUrl, poster, mode, themeSlug, atEntryId, onWatched, autoPlay }: VideoPlayerProps) {
  const hasLoggedView = useRef(false)
  const plyrRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isCounted, setIsCounted] = useState(false)

  const togglePlay = useCallback(async () => {
    const plyr = plyrRef.current?.plyr || plyrRef.current
    if (plyr && typeof plyr.play === 'function') {
      try {
        if (plyr.paused) {
          await plyr.play()
        } else {
          await plyr.pause()
        }
      } catch (err: any) {
        if (err.name !== 'Aborted' && err.name !== 'AbortError') {
          console.error('[VideoPlayer] Playback toggle error:', err)
        }
      }
    }
  }, [])

  const logView = useCallback(async () => {
    if (hasLoggedView.current) return
    hasLoggedView.current = true
    
    try {
      console.log(`[VideoPlayer] Attempting to log ${mode} for ${themeSlug}...`)
      const res = await authFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeSlug, atEntryId, mode }),
      })
      const json = await res.json()
      if (json.success) {
        setIsCounted(true)
        console.log(`[VideoPlayer] Successfully logged ${mode} for ${themeSlug}`)
        toast.success(`Success! Added to your ${mode} pulse.`)
        if (onWatched) onWatched()
      } else {
        console.error(`[VideoPlayer] API returned failure:`, json.error)
        hasLoggedView.current = false
      }
    } catch (err: any) {
      console.error(`[VideoPlayer] Failed to log history:`, err)
      hasLoggedView.current = false
    }
  }, [themeSlug, atEntryId, mode, onWatched])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    if (!hasLoggedView.current) {
      logView()
    }
  }, [logView])

  const handleTimeUpdate = useCallback(() => {
    if (hasLoggedView.current) return
    const plyr = plyrRef.current?.plyr || plyrRef.current
    if (plyr && typeof plyr.currentTime !== 'undefined') {
      try {
        let duration = plyr.duration
        if (!duration || duration === Infinity || isNaN(duration)) {
           duration = 90
        }
        const p = Math.min(plyr.currentTime / duration, 1)
        setProgress(p)
        if (p >= 0.1) {
          logView()
        }
      } catch (e) {}
    }
  }, [logView])

  useEffect(() => {
    hasLoggedView.current = false
    let playerInstance: any = null

    const attachListeners = () => {
      const player = plyrRef.current?.plyr || plyrRef.current
      if (player && player.on) {
        player.on('play', handlePlay)
        player.on('pause', handlePause)
        player.on('playing', handlePlay)
        player.on('ended', handleEnded)
        player.on('timeupdate', handleTimeUpdate)
        playerInstance = player
        return true
      }
      return false
    }

    let interval: NodeJS.Timeout | null = null
    if (!attachListeners()) {
      let attempts = 0
      interval = setInterval(() => {
        attempts++
        if (attachListeners() || attempts > 20) {
          if (interval) clearInterval(interval)
        }
      }, 500)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (playerInstance && typeof playerInstance.off === 'function') {
        try {
          playerInstance.off('play', handlePlay)
          playerInstance.off('pause', handlePause)
          playerInstance.off('ended', handleEnded)
          playerInstance.off('timeupdate', handleTimeUpdate)
        } catch (e) {}
      }
    }
  }, [themeSlug, atEntryId, handlePlay, handlePause, handleEnded, handleTimeUpdate])

  useEffect(() => {
    if (!isPlaying || hasLoggedView.current) return
    const interval = setInterval(() => {
      handleTimeUpdate()
    }, 2000)
    return () => clearInterval(interval)
  }, [isPlaying, handleTimeUpdate])

  const memoizedSources = useMemo(() => {
    if (mode === 'listen' && audioUrl) {
      return [{ src: audioUrl, type: 'audio/mpeg' }]
    }
    return videoSources
      .sort((a, b) => b.resolution - a.resolution)
      .map(s => ({ src: s.url, type: 'video/webm', size: s.resolution }))
  }, [videoSources, audioUrl, mode])

  const memoizedSource = useMemo(() => ({
    type: (mode === 'listen' && audioUrl) ? 'audio' as const : 'video' as const,
    sources: memoizedSources,
    poster,
  }), [memoizedSources, poster, mode, audioUrl])

  const memoizedOptions = useMemo(() => ({
    ratio: '16:9',
    controls: mode === 'watch' 
      ? ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'] 
      : [],
    autoplay: autoPlay || false,
    keyboard: { focused: true, global: false },
  }), [mode, autoPlay])

  return (
    <div 
      key={`${themeSlug}-${atEntryId}-${mode}`}
      className="relative w-full aspect-video rounded-none md:rounded-card overflow-hidden bg-black shadow-lg"
      style={{ '--plyr-color-main': 'var(--accent)' } as React.CSSProperties}
    >
      {/* Player Logic Wrapper - Always present but styled/positioned differently based on mode */}
      <div 
        className={mode === 'watch' ? 'w-full h-full' : 'absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-0 select-none'}
      >
        <Plyr
          ref={plyrRef}
          source={memoizedSource}
          options={memoizedOptions}
        />
      </div>

      {mode === 'listen' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-surface">
          {poster && (
            <Image 
              src={poster} 
              fill
              className="object-cover opacity-20 blur-sm" 
              alt="poster" 
              referrerPolicy="no-referrer"
            />
          )}
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="flex items-end gap-1.5 h-16">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 bg-accent-mint rounded-full transition-all duration-300 ${isPlaying ? `animate-bounce-custom` : 'h-2'}`}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: isPlaying ? `${Math.random() * 40 + 20}px` : '8px'
                  }} 
                />
              ))}
            </div>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center
                         shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 relative group"
            >
              <div className="relative z-10 flex flex-col items-center">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                {!isCounted && (
                  <span className="text-[8px] font-mono leading-none mt-0.5">
                    {Math.round(progress * 100)}%
                  </span>
                )}
              </div>
              
              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="32" cy="32" r="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={188.4}
                  strokeDashoffset={188.4 * (1 - progress)}
                  className="text-white/30 transition-all duration-500"
                />
              </svg>
            </button>

            {isCounted && (
              <div className="absolute -top-12 px-3 py-1 bg-accent-mint text-bg-surface rounded-full text-[10px] font-mono font-bold uppercase animate-bounce shadow-glow">
                ✨ Watch Counted
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
