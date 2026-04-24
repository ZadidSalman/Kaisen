'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Play, Plus, Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchLibraryThemes, fetchFavoriteThemes } from '@/lib/api/themes'
import { useAuth } from '@/hooks/useAuth'
import { setAccessToken } from '@/lib/auth-client'
import { getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'
import { ThemeLibraryRow } from '@/app/components/library/ThemeLibraryRow'

export function LibraryClient() {
  const { user, refreshUser } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [filterType, setFilterType] = useState<'OP' | 'ED'>('OP')

  // Fetch library themes (Watched Anime)
  const { data: libraryData, isLoading: isLibraryLoading, refetch: refetchLibrary } = useQuery({
    queryKey: ['watched-themes', filterType],
    queryFn: () => fetchLibraryThemes(filterType, 1, 3),
    enabled: !!user,
  })

  // Fetch favorite themes
  const { data: favoritesData, isLoading: isFavoritesLoading, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites-themes', filterType],
    queryFn: () => fetchFavoriteThemes(filterType, 1, 3),
    enabled: !!user,
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.accessToken
        if (token) setAccessToken(token)
        toast.success(user ? 'AniList connected successfully!' : 'Logged in with AniList!')
        refreshUser()
        setIsConnecting(false)
        refetchLibrary()
        refetchFavorites()
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        toast.error(`Auth failed: ${event.data.error}`)
        setIsConnecting(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refreshUser, refetchLibrary, refetchFavorites, user])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/auth/anilist/url')
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.open(url, 'anilist_auth', 'width=600,height=700')
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize AniList connection')
      setIsConnecting(false)
    }
  }

  // Authentication placeholder
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-bg-base">
        <h1 className="text-2xl font-display font-bold text-accent mb-2">Kaikansen</h1>
        <p className="text-ktext-secondary mb-8 max-w-sm">
          Log in to see your watched themes and sync with AniList.
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-full font-body font-bold interactive disabled:opacity-50"
        >
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login / Connect AniList'}
        </button>
      </div>
    )
  }
  
  const watchedThemes = libraryData?.data || []
  const favoriteTracks = favoritesData?.data || []
  
  // Derive top artists
  const artistsMap = new Map()
  watchedThemes.forEach((t: any) => {
    if (t.artistName && t.artistName !== 'Unknown' && !artistsMap.has(t.artistName)) {
      artistsMap.set(t.artistName, { name: t.artistName, image: getFallbackImage(t.artistName) })
    }
  })
  const topArtists = Array.from(artistsMap.values()).slice(0, 4)

  const isLoading = isLibraryLoading || isFavoritesLoading

  return (
    <div className="min-h-screen bg-[#FDF8F6] dark:bg-bg-base pb-24">
      <div className="px-6 space-y-8 mt-4 pt-4">
        {/* Watched Anime Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-display font-bold text-[#3B2C35] dark:text-white">Watched Anime</h2>
            <Link 
              href={`/library/view-all/watched?type=${filterType}`}
              className="text-sm font-bold text-accent hover:underline"
            >
              View Full
            </Link>
          </div>
          
          {/* Toggle */}
          <div className="flex bg-[#F2DEE4] dark:bg-bg-toast rounded-full p-1 mb-6">
            <button
              onClick={() => setFilterType('OP')}
              className={`flex-1 py-2.5 rounded-full text-sm font-display font-bold transition-all ${
                filterType === 'OP' ? 'bg-accent text-white shadow-sm' : 'text-[#8C6D7D]'
              }`}
            >
              Openings
            </button>
            <button
              onClick={() => setFilterType('ED')}
              className={`flex-1 py-2.5 rounded-full text-sm font-display font-bold transition-all ${
                filterType === 'ED' ? 'bg-accent text-white shadow-sm' : 'text-[#8C6D7D]'
              }`}
            >
              Endings
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLibraryLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-[72px] bg-[#F2DEE4] dark:bg-bg-toast rounded-[36px] shimmer" />)
            ) : watchedThemes.length > 0 ? (
              watchedThemes.map((theme: any, index: number) => (
                <ThemeLibraryRow 
                  key={theme.slug} 
                  theme={theme} 
                  index={index} 
                />
              ))
            ) : (
              <p className="text-sm text-ktext-secondary text-center py-4">No {filterType}s found.</p>
            )}
          </div>
        </section>

        {/* Favorite Tracks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-display font-bold text-[#3B2C35] dark:text-white">Favorite Tracks</h2>
            <Link 
              href={`/library/view-all/favorites?type=${filterType}`}
              className="text-sm font-bold text-accent hover:underline"
            >
              View Full
            </Link>
          </div>
          <div className="space-y-3">
            {isFavoritesLoading ? (
              [...Array(2)].map((_, i) => <div key={i} className="h-[72px] bg-[#F2DEE4] dark:bg-bg-toast rounded-[36px] shimmer" />)
            ) : favoriteTracks.length > 0 ? (
              favoriteTracks.map((theme: any) => (
                <ThemeLibraryRow 
                  key={theme.slug} 
                  theme={theme} 
                  isFavorite={true} 
                />
              ))
            ) : (
              <p className="text-sm text-ktext-secondary text-center py-4">No favorite {filterType}s yet.</p>
            )}
          </div>
        </section>

        {/* Top Artists Section */}
        <section>
          <h2 className="text-[22px] font-display font-bold text-[#3B2C35] dark:text-white mb-4">Top Artists</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-[72px] h-[72px] rounded-full bg-[#F2DEE4] dark:bg-bg-toast shimmer" />
                  <div className="w-12 h-3 bg-[#F2DEE4] dark:bg-bg-toast shimmer rounded-full" />
                </div>
              ))
            ) : topArtists.length > 0 ? (
              topArtists.map((artist: any) => (
                <div key={artist.name} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                  <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-bg-elevated relative ring-2 ring-transparent group-hover:ring-accent transition-all">
                    <Image src={artist.image} fill className="object-cover" alt={artist.name} />
                  </div>
                  <p className="text-xs font-bold text-[#3B2C35] dark:text-white truncate w-[72px] text-center">{artist.name}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ktext-secondary">No artists yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
