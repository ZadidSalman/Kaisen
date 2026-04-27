'use client'
import { useState, useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, X, Music, Loader2, ChevronRight } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { UserCard } from '@/app/components/shared/UserCard'
import { AnimeCard } from '@/app/components/shared/AnimeCard'
import { ArtistCard } from '@/app/components/shared/ArtistCard'

type SearchTab = 'ALL' | 'SONGS' | 'ARTISTS' | 'ANIME' | 'USERS'

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('ALL')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { ref: loadMoreRef, inView } = useInView()
  const normalizedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(normalizedQuery), 300)
    return () => clearTimeout(timer)
  }, [normalizedQuery])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['search', debouncedQuery, activeTab],
    queryFn: async ({ pageParam = 1, signal }) => {
      if (debouncedQuery.length < 2) return { data: { songs: [], artists: [], anime: [], users: [] }, meta: { searchType: 'none' } }
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: pageParam.toString(),
        type: activeTab,
      })
      const res = await fetch(`/api/search?${params}`, { signal })
      if (!res.ok) {
        throw new Error(`Search request failed with status ${res.status}`)
      }
      return res.json()
    },
    getNextPageParam: (lastPage) => lastPage.meta?.hasMore ? lastPage.meta.page + 1 : undefined,
    enabled: debouncedQuery.length >= 2,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const meta = data?.pages[0]?.meta
  
  // Flatten results for specific tabs
  const allSongs = data?.pages.flatMap(page => page.data?.songs ?? []) ?? []
  const allArtists = data?.pages.flatMap(page => page.data?.artists ?? []) ?? []
  const allAnime = data?.pages.flatMap(page => page.data?.anime ?? []) ?? []
  const allUsers = data?.pages.flatMap(page => page.data?.users ?? []) ?? []

  // "All" tab uses just the first page (top 5)
  const firstPage = data?.pages[0]?.data ?? { songs: [], artists: [], anime: [], users: [] }
  const isAllTab = activeTab === 'ALL'

  const showInfoBanners = () => {
    // OP / ED + sequence active filter badge
    if (meta?.themeTypeFilter) {
      const label = meta.themeSeqFilter != null
        ? `${meta.themeTypeFilter} ${meta.themeSeqFilter}`
        : meta.themeTypeFilter
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-accent-container rounded-[12px] animate-in fade-in slide-in-from-top-1 w-fit">
            <Music className="w-4 h-4 text-accent flex-shrink-0" />
            <p className="text-xs font-body text-accent">Filtering by <span className="font-bold">{label}</span> themes</p>
          </div>
        </div>
      )
    }
    return null
  }

  const renderEmptyState = () => {
    if (debouncedQuery.length < 2) {
      return (
        <div className="text-center py-12">
          <p className="text-ktext-tertiary font-body">Start typing to search...</p>
        </div>
      )
    }
    if (!isLoading && allSongs.length === 0 && allArtists.length === 0 && allAnime.length === 0 && allUsers.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-ktext-tertiary font-body">No results found for &quot;{debouncedQuery}&quot;</p>
        </div>
      )
    }
    return null
  }

  const renderSectionHeader = (title: string, onSeeFull?: () => void) => (
    <div className="flex items-center justify-between px-2 mb-3 mt-6">
      <h3 className="text-sm font-display font-secondary font-bold text-ktext-secondary tracking-tight">{title}</h3>
      {onSeeFull && isAllTab && (
        <button onClick={onSeeFull} className="flex items-center text-xs font-body text-accent interactive group">
          See Full <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  )

  return (
    <div className="pt-4 space-y-4 pb-20">
      <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-full px-4 border border-border-default focus-within:border-border-accent transition-all">
        <Search className="w-4 h-4 text-ktext-tertiary flex-shrink-0" />
        <input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs, artists, anime, or users…"
          className="flex-1 bg-transparent outline-none text-sm font-body text-ktext-primary" 
        />
        {query && (
          <button onClick={() => setQuery('')} className="interactive rounded-full p-1">
            <X className="w-4 h-4 text-ktext-tertiary" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(['ALL', 'SONGS', 'ARTISTS', 'ANIME', 'USERS'] as SearchTab[]).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 h-9 px-6 rounded-full text-sm font-body font-medium transition-all interactive
              ${activeTab === tab
                ? 'bg-accent text-white shadow-md'
                : 'bg-bg-surface border border-border-default text-ktext-secondary'
              }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {showInfoBanners()}

      {isLoading ? (
        <div className="space-y-4 mt-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-[16px] bg-bg-elevated shimmer" />
          ))}
        </div>
      ) : (
        <>
          {/* Artists Section */}
          {(isAllTab ? firstPage.artists.length > 0 : activeTab === 'ARTISTS' && allArtists.length > 0) && (
            <div>
              {renderSectionHeader('Artists', () => setActiveTab('ARTISTS'))}
              <div className={isAllTab ? "flex gap-4 overflow-x-auto scrollbar-hide px-2 pb-2" : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 px-2"}>
                {(isAllTab ? firstPage.artists : allArtists).map((artist: any) => (
                  <ArtistCard key={artist.slug} artist={artist} />
                ))}
              </div>
            </div>
          )}

          {/* Anime Section */}
          {(isAllTab ? firstPage.anime.length > 0 : activeTab === 'ANIME' && allAnime.length > 0) && (
            <div>
              {renderSectionHeader('Anime', () => setActiveTab('ANIME'))}
              <div className={isAllTab ? "flex gap-4 overflow-x-auto scrollbar-hide px-2 pb-2" : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 px-2"}>
                {(isAllTab ? firstPage.anime : allAnime).map((animeItem: any) => (
                  <AnimeCard key={animeItem.anilistId || animeItem.kitsuId || animeItem.malId} anime={animeItem} />
                ))}
              </div>
            </div>
          )}

          {/* Songs Section */}
          {(isAllTab ? firstPage.songs.length > 0 : activeTab === 'SONGS' && allSongs.length > 0) && (
            <div>
              {renderSectionHeader('Songs', () => setActiveTab('SONGS'))}
              <div className="space-y-2">
                {(isAllTab ? firstPage.songs : allSongs).map((theme: any) => (
                  <ThemeListRow key={theme.slug} {...theme} />
                ))}
              </div>
            </div>
          )}

          {/* Users Section */}
          {(isAllTab ? firstPage.users.length > 0 : activeTab === 'USERS' && allUsers.length > 0) && (
            <div>
              {renderSectionHeader('People', () => setActiveTab('USERS'))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2">
                {(isAllTab ? firstPage.users : allUsers).map((user: any) => (
                  <UserCard key={user.username} user={user} />
                ))}
              </div>
            </div>
          )}

          {renderEmptyState()}

          {/* Infinite Scroll Trigger */}
          {!isAllTab && hasNextPage && (
            <div ref={loadMoreRef} className="w-full py-8 flex justify-center">
              {isFetchingNextPage ? (
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              ) : (
                <div className="w-6 h-6" /> // Placeholder to trigger intersection
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
