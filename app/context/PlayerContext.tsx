'use client'
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { IThemeCache } from '@/types/app.types'

interface PlayerContextType {
  playlist: IThemeCache[]
  currentIndex: number
  isPlaying: boolean
  currentTheme: IThemeCache | null
  playTheme: (theme: IThemeCache, playlist?: IThemeCache[]) => void
  next: () => void
  previous: () => void
  togglePlay: () => void
  setPlaylist: (themes: IThemeCache[]) => void
  setIsPlaying: (playing: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylistState] = useState<IThemeCache[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentTheme = currentIndex >= 0 ? playlist[currentIndex] : null

  const playTheme = useCallback((theme: IThemeCache, newPlaylist?: IThemeCache[]) => {
    if (newPlaylist) {
      setPlaylistState(newPlaylist)
      const index = newPlaylist.findIndex(t => t.slug === theme.slug)
      setCurrentIndex(index >= 0 ? index : 0)
    } else {
      setPlaylistState([theme])
      setCurrentIndex(0)
    }
    setIsPlaying(true)
  }, [])

  const next = useCallback(() => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsPlaying(true)
    }
  }, [currentIndex, playlist])

  const previous = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setIsPlaying(true)
    }
  }, [currentIndex])

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
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
      setIsPlaying
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
