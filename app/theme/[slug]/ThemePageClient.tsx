'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IThemeCache, IThemeEntry } from '@/types/app.types'
import { VideoPlayer } from '@/app/components/theme/VideoPlayer'
import { WatchListenToggle } from '@/app/components/theme/WatchListenToggle'
import { RatingWidget } from '@/app/components/theme/RatingWidget'
import { VersionSwitcher } from '@/app/components/theme/VersionSwitcher'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { getScoreColor, formatCount, getFallbackImage } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'
import { Star, Eye, Headphones } from 'lucide-react'
import { toast } from 'sonner'

export function ThemePageClient({ initialData }: { initialData: IThemeCache }) {
  const searchParams = useSearchParams()
  const isAutoplay = searchParams.get('autoplay') === 'true'

  const [theme, setTheme] = useState(initialData)
  const [mode, setMode] = useState<'watch' | 'listen'>('watch')
  const [selectedEntry, setSelectedEntry] = useState<IThemeEntry>(
    theme.entries.find(e => e.version === 'Standard') ?? theme.entries[0]
  )

  const fallback = getFallbackImage(theme.slug)

  const [userRating, setUserRating] = useState(0)
  const [hasWatched, setHasWatched] = useState(false)
  const [similarThemes, setSimilarThemes] = useState<IThemeCache[]>([])

  useEffect(() => {
    const checkUserStats = async () => {
      try {
        const [ratingRes, historyRes, similarRes] = await Promise.all([
          authFetch(`/api/themes/${theme.slug}/rate`),
          authFetch(`/api/history/check?slug=${theme.slug}`),
          fetch(`/api/themes/${theme.slug}/similar`).then(r => r.json())
        ])
        const ratingJson = await ratingRes.json()
        const historyJson = await historyRes.json()
        
        if (ratingJson.success && ratingJson.data) {
          setUserRating(ratingJson.data.score)
        }
        if (historyJson.success) {
          setHasWatched(historyJson.watched)
        }
        if (similarRes.success) {
          setSimilarThemes(similarRes.data)
        }
      } catch (err) {
        console.error('Failed to fetch user interaction stats:', err)
      }
    }
    checkUserStats()
  }, [theme.slug])

  const handleRate = async (score: number) => {
    try {
      const res = await authFetch(`/api/themes/${theme.slug}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, mode }),
      })
      const json = await res.json()
      if (json.success) {
        setUserRating(score)
        toast.success(`Theme rated ${score}/10!`)
        // Optionally refetch theme stats if needed
      } else {
        toast.error(json.error || 'Failed to submit rating')
      }
    } catch (err) {
      toast.error('Could not submit rating. Are you logged in?')
    }
  }

  const handleWatched = useCallback(() => {
    setHasWatched(true)
    setTheme(prev => ({
      ...prev,
      totalWatches: mode === 'watch' ? (prev.totalWatches || 0) + 1 : (prev.totalWatches || 0),
      totalListens: mode === 'listen' ? (prev.totalListens || 0) + 1 : (prev.totalListens || 0)
    }))
  }, [mode])

  return (
    <div className="pb-8 pt-4">
      <div className="-mx-4 md:mx-0">
        <VideoPlayer 
          videoSources={selectedEntry.videoSources} 
          audioUrl={selectedEntry.audioUrl}
          poster={theme.animeCoverImage ?? fallback} 
          mode={mode} 
          themeSlug={theme.slug}
          atEntryId={selectedEntry.atEntryId}
          onWatched={handleWatched}
          autoPlay={isAutoplay}
        />
      </div>

      <div className="px-4 mt-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-display font-bold text-ktext-primary leading-tight">{theme.songTitle}</h1>
              {hasWatched && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-mint/20 text-accent-mint rounded-full border border-accent-mint/30">
                  <Eye className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-bold uppercase">Watched</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
              {theme.allArtists.map((name, i) => (
                <Link 
                  key={theme.artistSlugs[i] || i} 
                  href={`/artist/${theme.artistSlugs[i]}`}
                  className="text-sm font-body text-accent font-semibold hover:underline"
                >
                  {name}{i < theme.allArtists.length - 1 ? ',' : ''}
                </Link>
              ))}
              {theme.allArtists.length === 0 && theme.artistName && (
                <p className="text-sm font-body text-accent font-semibold">{theme.artistName}</p>
              )}
            </div>
            <Link href={`/anime/${theme.anilistId}`} className="inline-block text-xs font-body text-ktext-tertiary mt-1.5 hover:text-accent transition-colors">
              ∞ {theme.animeTitle}
            </Link>
          </div>
          
          <WatchListenToggle mode={mode} onModeChange={setMode} audioDisabled={!selectedEntry.audioUrl} />
        </div>

        {theme.entries.length > 1 && (
          <VersionSwitcher 
            entries={theme.entries} 
            selected={selectedEntry} 
            onSelect={setSelectedEntry} 
          />
        )}

        <div className="flex gap-2">
          {[
            { value: theme.avgRating?.toFixed(1) ?? '—', label: 'AVG RATING', color: getScoreColor(Math.round(theme.avgRating || 0)) },
            { value: formatCount(theme.totalRatings || 0), label: 'RATINGS' },
            { value: formatCount(theme.totalWatches || 0), label: 'WATCHES' },
            { value: formatCount(theme.totalListens || 0), label: 'LISTENS' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 bg-bg-elevated rounded-[16px] p-2 text-center">
              <p className="text-lg font-mono font-bold text-ktext-primary"
                 style={stat.color ? { color: stat.color } : {}}>
                {stat.value}
              </p>
              <p className="text-[10px] font-body text-ktext-tertiary tracking-tight uppercase">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-4 shadow-card">
          <RatingWidget userRating={userRating} onRate={handleRate} />
        </div>

        {similarThemes.length > 0 && (
          <div className="pt-8">
            <h2 className="text-sm font-display font-bold text-ktext-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent" />
              Similar Themes
            </h2>
            <div className="space-y-2">
              {similarThemes.map(t => (
                <ThemeListRow key={t.slug} {...t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
