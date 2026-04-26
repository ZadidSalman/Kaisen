
'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Loader2, AlertCircle, RefreshCcw, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { 
  NormalizedWatchEntry, 
  normalizeAniListEntry, 
  normalizeLocalEntry, 
  mergeWatchHistory 
} from '@/lib/history-utils'
import Image from 'next/image'
import Link from 'next/link'

interface UnifiedWatchHistoryProps {
  username: string;
}

const PAGE_SIZE = 20;

export function UnifiedWatchHistory({ username }: UnifiedWatchHistoryProps) {
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const isOwnProfile = currentUser?.username === username

  const { 
    data: mergedHistory, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['watch-history', username],
    queryFn: async () => {
      // 1. Fetch Local History
      const localRes = await fetch(`/api/users/${username}/history`)
      const localData = await localRes.json()
      const localEntries = localData.success ? localData.data.map(normalizeLocalEntry) : []

      // 2. Fetch AniList History (if it's the current user's profile and they have AniList)
      let remoteEntries: NormalizedWatchEntry[] = []
      if (isOwnProfile && currentUser?.anilist?.accessToken) {
        try {
          const anilistRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentUser.anilist.accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              query: `
                query ($userId: Int) {
                  MediaListCollection(userId: $userId, type: ANIME, status: COMPLETED) {
                    lists {
                      entries {
                        updatedAt
                        media {
                          id
                          title {
                            romaji
                            english
                          }
                          coverImage {
                            large
                          }
                          episodes
                        }
                      }
                    }
                  }
                }
              `,
              variables: { userId: currentUser.anilist.userId }
            }),
          })
          const anilistData = await anilistRes.json()
          if (anilistData.data?.MediaListCollection?.lists) {
            remoteEntries = anilistData.data.MediaListCollection.lists.flatMap((list: any) => 
              list.entries.map(normalizeAniListEntry)
            )
          }
        } catch (err) {
          console.error('Failed to fetch AniList history:', err)
          // We don't want to fail the whole query if AniList fails
        }
      }

      // 3. Merge and deduplicate
      return mergeWatchHistory(localEntries, remoteEntries)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    retry: 2,
  })

  const filteredHistory = useMemo(() => {
    if (!mergedHistory) return []
    return mergedHistory.filter(entry => 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.animeTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [mergedHistory, searchQuery])

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE)
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredHistory.slice(start, start + PAGE_SIZE)
  }, [filteredHistory, page])

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <p className="text-sm font-body text-ktext-tertiary">Merging watch history...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-[28px] p-8 text-center flex flex-col items-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div>
          <h3 className="text-lg font-display font-black text-ktext-primary">Failed to load history</h3>
          <p className="text-sm font-body text-ktext-secondary mt-1">{(error as Error)?.message || 'An unexpected error occurred'}</p>
        </div>
        <button 
          onClick={handleRetry}
          className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-full font-bold interactive"
        >
          <RefreshCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-ktext-tertiary group-focus-within:text-accent transition-colors" />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Search your watch history..."
          className="w-full bg-bg-surface border border-border-subtle rounded-full py-3 pl-11 pr-11 text-sm font-body text-ktext-primary outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => {
              setSearchQuery('')
              setPage(1)
            }}
            className="absolute inset-y-0 right-4 flex items-center text-ktext-tertiary hover:text-ktext-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {paginatedHistory.length > 0 ? (
          paginatedHistory.map((entry) => (
            <HistoryItem key={`${entry.source}-${entry.id}`} entry={entry} />
          ))
        ) : (
          <div className="text-center py-12 bg-bg-surface/50 rounded-[32px] border border-border-subtle border-dashed">
            <p className="text-sm font-body text-ktext-tertiary italic">
              {searchQuery ? `No results found for "${searchQuery}"` : 'Your watch history is empty.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center interactive disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="sr-only">Previous Page</span>
            &larr;
          </button>
          <div className="px-4 py-2 bg-bg-surface border border-border-subtle rounded-full text-xs font-bold text-ktext-secondary">
            Page {page} of {totalPages}
          </div>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center interactive disabled:opacity-30 disabled:pointer-events-none"
          >
            <span className="sr-only">Next Page</span>
            &rarr;
          </button>
        </div>
      )}
    </div>
  )
}

function HistoryItem({ entry }: { entry: NormalizedWatchEntry }) {
  const isAniList = entry.source === 'AniList'
  
  return (
    <div className="bg-bg-surface hover:bg-bg-elevated border border-border-subtle hover:border-accent/20 rounded-[24px] p-3 flex items-center gap-4 transition-all group">
      <div className="w-16 h-16 rounded-xl overflow-hidden relative flex-shrink-0 bg-bg-elevated shadow-sm">
        <Image 
          src={entry.image || 'https://picsum.photos/seed/anime/200'} 
          fill 
          className="object-cover group-hover:scale-110 transition-transform duration-500" 
          alt={entry.title}
          unoptimized={true}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isAniList 
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
              : 'bg-accent/10 text-accent border border-accent/20'
          }`}>
            {entry.source}
          </span>
          {entry.type && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-ktext-tertiary/10 text-ktext-tertiary border border-ktext-tertiary/20">
              {entry.type}
            </span>
          )}
        </div>
        
        <h4 className="text-sm font-display font-black text-ktext-primary truncate uppercase tracking-tight">
          {entry.title}
        </h4>
        
        <p className="text-xs font-body text-ktext-tertiary font-medium truncate">
          {entry.animeTitle ? `${entry.animeTitle} • ` : ''}
          {entry.episodeCount ? `${entry.episodeCount} Episodes • ` : ''}
          {new Date(entry.lastWatchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="flex-shrink-0 pr-2">
        {entry.source === 'Local' && entry.slug ? (
          <Link 
            href={`/theme/${entry.slug}`}
            className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent interactive"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        ) : (
          <a 
            href={`https://anilist.co/anime/${entry.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 interactive"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  )
}
