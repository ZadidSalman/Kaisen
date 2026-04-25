'use client'

import { useParams, useRouter } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { fetchSeasonalThemes } from '@/lib/api/themes'
import { queryKeys } from '@/lib/queryKeys'

export default function SeasonalPage() {
  const params = useParams()
  const router = useRouter()
  const season = (params.season as string).toUpperCase()
  const year = parseInt(params.year as string)

  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKeys.themes.seasonal(season, year),
    queryFn: ({ pageParam = 1 }) => fetchSeasonalThemes(season, year, undefined, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const themes = data?.pages.flatMap(page => page.data) ?? []

  return (
    <div className="min-h-screen bg-bg-surface pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-surface/80 backdrop-blur-md px-4 py-4 flex items-center gap-4 border-b border-white/5">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full bg-bg-elevated text-ktext-primary interactive"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-ktext-primary capitalize">
            {season.toLowerCase()} {year}
          </h1>
          <p className="text-xs font-body text-ktext-secondary">Seasonal Discoveries</p>
        </div>
      </header>

      <main className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-ktext-secondary font-body">Loading seasonal themes...</p>
          </div>
        ) : themes.length > 0 ? (
          <>
            {themes.map((theme: any, index: number) => (
              <ThemeListRow key={`${theme.slug}-${index}`} {...theme} />
            ))}

            {/* Sentinel */}
            <div ref={ref} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              ) : hasNextPage ? (
                <div className="h-10" />
              ) : (
                <p className="text-sm text-ktext-tertiary font-body">That&apos;s all for {season.toLowerCase()} {year}! ✨</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-ktext-secondary font-body">No themes found for this season.</p>
          </div>
        )}
      </main>
    </div>
  )
}
