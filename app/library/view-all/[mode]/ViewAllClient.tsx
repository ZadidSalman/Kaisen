'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Loader2, Music, History, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { ThemeLibraryRow } from '@/app/components/library/ThemeLibraryRow'
import { authFetch } from '@/lib/auth-client'

interface ViewAllClientProps {
  mode: string // 'watched' | 'favorites'
}

export function ViewAllClient({ mode }: ViewAllClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type') as 'OP' | 'ED') || 'OP'
  
  const [activeTab, setActiveTab] = useState<'OP' | 'ED'>(initialType)
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const observer = useRef<IntersectionObserver | null>(null)
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  const fetchData = async (pageNum: number, type: 'OP' | 'ED', isNewTab: boolean = false) => {
    setLoading(true)
    try {
      const endpoint = mode === 'watched' ? '/api/themes/library' : '/api/themes/favorites'
      const res = await authFetch(`${endpoint}?page=${pageNum}&limit=20&type=${type}`)
      const result = await res.json()

      if (result.success) {
        if (isNewTab) {
          setItems(result.data)
        } else {
          setItems(prev => [...prev, ...result.data])
        }
        setHasMore(result.data.length === 20)
        setTotal(result.meta.total)
      }
    } catch (err) {
      console.error(`Failed to fetch ${mode}:`, err)
    } finally {
      setLoading(false)
    }
  }

  // Reset and fetch when tab changes
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchData(1, activeTab, true)
  }, [activeTab, mode])

  // Fetch more when page changes (but not on first load which is handled above)
  useEffect(() => {
    if (page > 1) {
      fetchData(page, activeTab)
    }
  }, [page])

  const title = mode === 'watched' ? 'Watched Themes' : 'Favorite Themes'
  const Icon = mode === 'watched' ? History : Heart

  return (
    <div className="min-h-screen bg-[#FDF8F6] dark:bg-[#1A1618] pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-bg-surface shadow-sm border border-border-subtle interactive"
            >
              <ChevronLeft className="w-5 h-5 text-ktext-primary" />
            </button>
            <h1 className="text-[22px] font-display font-black text-ktext-primary tracking-tight">
              {title}
            </h1>
          </div>
          <p className="text-sm font-bold text-accent">
            {total} Total
          </p>
        </div>

        {/* OP/ED Toggle - Styled like image */}
        <div className="flex bg-[#F2DEE4] dark:bg-bg-toast rounded-full p-1 mb-2">
          {(['OP', 'ED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-full text-sm font-display font-bold transition-all duration-300
                ${activeTab === tab 
                  ? 'bg-accent text-white shadow-md' 
                  : 'text-[#8C6D7D] dark:text-ktext-tertiary hover:text-accent'
                }
              `}
            >
              {tab === 'OP' ? 'Openings' : 'Endings'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-6 py-8">
        <div className="space-y-4 max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {items.map((theme, index) => (
              <motion.div
                key={`${theme._id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 20) * 0.05 }}
                ref={index === items.length - 1 ? lastItemRef : null}
              >
                <ThemeLibraryRow 
                  theme={theme} 
                  index={index} 
                  isFavorite={mode === 'favorites'} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Loading States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-xs font-bold text-[#3B2C35]/40 dark:text-white/40 uppercase tracking-widest">
              Loading more themes...
            </p>
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <div className="text-center py-12 border-t border-[#3B2C35]/5 dark:border-white/5 mt-8">
            <Music className="w-8 h-8 text-accent/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#3B2C35]/40 dark:text-white/40 italic">
              You&apos;ve reached the end of your {mode} collection
            </p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <Icon className="w-16 h-16 mb-4" />
            <p className="text-lg font-display font-bold">No tracks found</p>
            <p className="text-sm">Try exploring and adding some themes!</p>
          </div>
        )}
      </div>
    </div>
  )
}
