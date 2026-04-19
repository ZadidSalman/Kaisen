'use client'
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Sparkles } from 'lucide-react'
import { ThemeFeaturedCard } from '@/app/components/theme/ThemeFeaturedCard'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { SurpriseBanner } from '@/app/components/shared/SurpriseBanner'
import { fetchPopularThemes, fetchSeasonalThemes, fetchLiveStats } from '@/lib/api/themes'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/hooks/useAuth'
import { formatCount } from '@/lib/utils'

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

  const { data: statsData } = useQuery({
    queryKey: queryKeys.stats.live(),
    queryFn: fetchLiveStats,
    refetchInterval: 30000,
  })

  const featuredThemes = seasonalData?.data?.slice(0, 10) ?? []
  const popularThemes = popularData?.data ?? []
  const stats = statsData?.data ?? { activeUsers: 0, listeningNow: 0, listeningAvatars: [] }

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

      {/* Live Stats Footer */}
      <div className="flex gap-3">
        <div className="flex-1 bg-bg-surface rounded-[16px] border border-border-subtle p-4 shadow-card">
          <TrendingUp className="w-5 h-5 text-accent mb-1" />
          <p className="text-xs font-body text-ktext-tertiary uppercase tracking-wide">Active Users</p>
          <p className="text-xl font-display font-bold text-ktext-primary">{formatCount(stats.activeUsers)}</p>
        </div>
        <div className="flex-1 bg-bg-surface rounded-[16px] border border-border-subtle p-4 shadow-card">
          <div className="flex items-center gap-1 mb-1">
            {stats.listeningAvatars.slice(0, 3).map((a: string, i: number) => (
              <div key={i} className="w-5 h-5 rounded-full -ml-1 first:ml-0 border border-bg-surface overflow-hidden relative">
                <Image src={a} fill unoptimized className="object-cover" alt="user" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
          <p className="text-xs font-body text-ktext-tertiary uppercase tracking-wide">Listening Now</p>
          <p className="text-xl font-display font-bold text-ktext-primary">{stats.listeningNow}</p>
        </div>
      </div>
    </div>
  )
}
