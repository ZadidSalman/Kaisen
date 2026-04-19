'use client'
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ThemeFeaturedCard } from '@/app/components/theme/ThemeFeaturedCard'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { SurpriseBanner } from '@/app/components/shared/SurpriseBanner'
import { fetchPopularThemes, fetchSeasonalThemes } from '@/lib/api/themes'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/hooks/useAuth'

export function HomeClient() {
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState<'OP' | 'ED' | null>(null)

  const { data: seasonalData } = useQuery({
    queryKey: queryKeys.themes.seasonal('SPRING', 2024), // Example current season
    queryFn: () => fetchSeasonalThemes('SPRING', 2024),
  })

  const { data: popularData } = useQuery({
    queryKey: queryKeys.themes.popular(typeFilter ?? undefined),
    queryFn: () => fetchPopularThemes(typeFilter ?? undefined),
  })

  const featuredThemes = seasonalData?.data?.slice(0, 10) ?? []
  const popularThemes = popularData?.data ?? []

  return (
    <div className="space-y-6 pt-4 pb-20">
      {/* Featured Strip */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-body font-semibold text-accent uppercase tracking-wide">Current Season</p>
            <h2 className="text-2xl font-display font-bold text-ktext-primary">Spring 2024</h2>
          </div>
          <Link href="/season/spring/2024" className="text-sm font-body text-accent font-semibold interactive">
            View All
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          {featuredThemes.length > 0 ? (
            featuredThemes.map((theme: any) => <ThemeFeaturedCard key={theme.slug} {...theme} />)
          ) : (
            [...Array(3)].map((_, i) => (
              <div key={i} className="w-40 md:w-48 aspect-[10/14] rounded-[20px] bg-bg-elevated shimmer" />
            ))
          )}
        </div>
      </section>

      {/* Surprise Me Section */}
      <section className="py-2">
        <SurpriseBanner />
      </section>

      {/* Popular Themes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-bold text-ktext-primary">🔥 Popular Themes</h2>
          <div className="flex gap-1 p-1 bg-bg-elevated rounded-full">
            {(['OP', 'ED'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t === typeFilter ? null : t)}
                className={`h-7 px-3 rounded-full text-xs font-body font-bold transition-all
                  ${typeFilter === t ? 'bg-accent text-white' : 'text-ktext-secondary'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {popularThemes.length > 0 ? (
            popularThemes.map((theme: any) => <ThemeListRow key={theme.slug} {...theme} />)
          ) : (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-[16px] bg-bg-elevated shimmer" />
            ))
          )}
        </div>
      </section>

    </div>
  )
}
