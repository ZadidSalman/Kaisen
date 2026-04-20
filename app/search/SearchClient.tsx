'use client'
import { useState, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, X, Sparkles, Music, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OP' | 'ED'>('ALL')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    status,
  } = useInfiniteQuery({
    queryKey: ['search', debouncedQuery, activeFilter],
    queryFn: async ({ pageParam = 1 }) => {
      if (debouncedQuery.length < 2) return { data: [], meta: { searchType: 'none' } }
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: pageParam.toString(),
      })
      if (activeFilter !== 'ALL') params.append('type', activeFilter)
      const res = await fetch(`/api/search?${params}`)
      return res.json()
    },
    getNextPageParam: (lastPage) => lastPage.meta?.hasMore ? lastPage.meta.page + 1 : undefined,
    enabled: debouncedQuery.length >= 2,
    initialPageParam: 1,
  })

  const results = data?.pages.flatMap(page => page.data) ?? []
  const meta = data?.pages[0]?.meta
  const users = data?.pages[0]?.users ?? []

  return (
    <div className="pt-4 space-y-4 pb-20">
      <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-full px-4
                      border border-border-default focus-within:border-border-accent transition-all">
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
        {['ALL', 'OP', 'ED'].map(filter => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter as any)}
            className={`flex-shrink-0 h-9 px-6 rounded-full text-sm font-body font-medium transition-all interactive
              ${activeFilter === filter
                ? 'bg-accent text-white shadow-md'
                : 'bg-bg-surface border border-border-default text-ktext-secondary'
              }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {meta?.searchType === 'semantic' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-container rounded-[12px] mb-3 animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
          <p className="text-xs font-body text-accent">
            No exact matches — showing semantically related results
          </p>
        </div>
      )}

      {meta?.searchType === 'mood' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-container rounded-[12px] mb-3 animate-in fade-in slide-in-from-top-1">
          <Music className="w-4 h-4 text-accent flex-shrink-0" />
          <p className="text-xs font-body text-accent">
            Showing themes matching the mood: {meta.moods?.join(', ')}
          </p>
        </div>
      )}

      {users.length > 0 && activeFilter === 'ALL' && (
        <div className="mb-6">
          <h3 className="text-sm font-display font-secondary font-bold text-ktext-secondary px-2 mb-3">People</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {users.map((user: any) => (
              <Link 
                href={`/user/${user.username}`} 
                key={user.username}
                className="flex items-center gap-3 p-3 bg-bg-surface border border-border-subtle rounded-[16px] interactive"
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden border border-border-subtle relative flex-shrink-0">
                  {user.avatarUrl ? (
                     <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" unoptimized referrerPolicy="no-referrer" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-xs font-bold text-ktext-tertiary">
                        {user.displayName.charAt(0).toUpperCase()}
                     </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-display font-bold text-ktext-primary truncate">{user.displayName}</p>
                  <p className="text-[10px] font-body text-ktext-tertiary truncate">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-display font-secondary font-bold text-ktext-secondary px-2 mb-3">Themes</h3>
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map((theme: any) => <ThemeListRow key={theme.slug} {...theme} />)
          ) : debouncedQuery.length >= 2 && !isLoading ? (
            <div className="text-center py-12">
              <p className="text-ktext-tertiary font-body">No results found for &quot;{debouncedQuery}&quot;</p>
            </div>
          ) : isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-[16px] bg-bg-elevated shimmer" />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-ktext-tertiary font-body">Start typing to search themes...</p>
            </div>
          )}
        </div>
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-3 text-sm font-body text-accent font-semibold interactive"
        >
          {isFetchingNextPage ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Load More'}
        </button>
      )}
    </div>
  )
}
