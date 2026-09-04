'use client'
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { IThemeCache } from '@/types/app.types'

interface PlayerContextType {
  playlist: IThemeCache[]
  currentIndex: number
  isPlaying: boolean
  currentTheme: IThemeCache | null
  playTheme: (theme: IThemeCache | any, playlist?: (IThemeCache | any)[]) => void
  next: () => void
  previous: () => void
  togglePlay: () => void
  setPlaylist: (themes: IThemeCache[]) => void
  setIsPlaying: (playing: boolean) => void
  closePlayer: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylistState] = useState<IThemeCache[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentTheme = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null

  const playTheme = useCallback((theme: IThemeCache | any, newPlaylist?: (IThemeCache | any)[]) => {
    if (!theme) return

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylistState(newPlaylist as IThemeCache[])
      const index = newPlaylist.findIndex(t => 
        (t.slug && theme.slug && t.slug === theme.slug) || 
        (t._id && theme._id && String(t._id) === String(theme._id))
      )
      setCurrentIndex(index >= 0 ? index : 0)
    } else {
      setPlaylistState([theme as IThemeCache])
      setCurrentIndex(0)
    }
    setIsPlaying(true)
  }, [])

  const next = useCallback(() => {
    if (playlist.length === 0) return
    setCurrentIndex(prev => (prev + 1 < playlist.length ? prev + 1 : 0))
    setIsPlaying(true)
  }, [playlist.length])

  const previous = useCallback(() => {
    if (playlist.length === 0) return
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : playlist.length - 1))
    setIsPlaying(true)
  }, [playlist.length])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const closePlayer = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(-1)
  }, [])

  const setPlaylist = useCallback((themes: IThemeCache[]) => {
    setPlaylistState(themes)
  }, [])

  return (
    <PlayerContext.Provider value={{ 
      playlist, 
      currentIndex, 
      isPlaying, 
      currentTheme,
      playTheme, 
      next, 
      previous, 
      togglePlay,
      setPlaylist,
      setIsPlaying,
      closePlayer
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
