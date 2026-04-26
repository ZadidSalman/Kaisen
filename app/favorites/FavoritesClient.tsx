'use client'

import { Heart, ArrowLeft, Loader2, Search, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { fetchFavoriteThemes } from '@/lib/api/themes'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

import { queryKeys } from '@/lib/queryKeys'

export function FavoritesClient() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'OP' | 'ED'>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.favorites.list(filterType === 'all' ? undefined : filterType),
    queryFn: () => fetchFavoriteThemes(filterType === 'all' ? undefined : filterType, 1, 100),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-bg-base">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6 border border-accent/20">
          <Heart className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ktext-primary mb-2">My Favorites</h1>
        <p className="text-ktext-secondary mb-8 max-w-sm">
          Please log in to see and manage your favorite anime themes.
        </p>
        <Link
          href="/login"
          className="bg-accent text-white px-8 py-3 rounded-full font-body font-bold interactive shadow-lg shadow-accent/20"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  const favorites = data?.data || []
  const filteredFavorites = favorites.filter((theme: any) => 
    theme.songTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    theme.animeTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    theme.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center border border-border-subtle interactive group shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-ktext-secondary group-hover:text-ktext-primary transition-colors" />
          </Link>
          <div>
            <h1 className="text-4xl font-display font-black text-ktext-primary italic tracking-tight uppercase leading-none">
              Favorites
            </h1>
            <p className="text-ktext-tertiary font-body font-medium mt-1">
              {favorites.length} {favorites.length === 1 ? 'theme' : 'themes'} saved to your list
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ktext-tertiary" />
            <input 
              type="text"
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border-subtle rounded-2xl py-2.5 pl-11 pr-4 text-sm font-body focus:border-accent/30 focus:ring-1 focus:ring-accent/30 outline-none transition-all"
            />
          </div>
          <div className="flex p-1 bg-bg-surface border border-border-subtle rounded-2xl">
            {(['all', 'OP', 'ED'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`
                  px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                  ${filterType === type 
                    ? 'bg-accent text-white shadow-md shadow-accent/20' 
                    : 'text-ktext-tertiary hover:text-ktext-primary'}
                `}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-3xl bg-bg-surface border border-border-subtle animate-pulse" />
          ))
        ) : filteredFavorites.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredFavorites.map((theme: any, i: number) => (
              <motion.div
                key={theme._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
              >
                <ThemeListRow {...theme} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center mb-6 border border-border-subtle">
              <Heart className="w-10 h-10 text-ktext-tertiary opacity-30" />
            </div>
            <h2 className="text-xl font-display font-bold text-ktext-primary mb-2">
              {searchQuery ? 'No results found' : 'Your list is empty'}
            </h2>
            <p className="text-ktext-secondary max-w-xs mx-auto">
              {searchQuery 
                ? `We couldn't find any favorites matching "${searchQuery}"` 
                : "Browse some themes and tap the heart icon to save them here!"}
            </p>
            {!searchQuery && (
              <Link 
                href="/" 
                className="mt-6 px-8 py-2.5 rounded-full bg-accent text-white font-bold interactive"
              >
                Explore Themes
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
