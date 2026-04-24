'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { IThemeCache, IThemeEntry } from '@/types/app.types'
import { VideoPlayer } from '@/app/components/theme/VideoPlayer'
import { WatchListenToggle } from '@/app/components/theme/WatchListenToggle'
import { RatingWidget } from '@/app/components/theme/RatingWidget'
import { CommentSection } from '@/app/components/theme/CommentSection'
import { VersionSwitcher } from '@/app/components/theme/VersionSwitcher'
import { PlaylistAddModal } from '@/app/components/theme/PlaylistAddModal'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { getScoreColor, formatCount, getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'motion/react'
import { Star, Eye, Headphones, Download, Loader2, Share2, Info, ListMusic, Music, LayoutGrid, Users } from 'lucide-react'
import { toast } from 'sonner'

export function ThemePageClient({ initialData }: { initialData: IThemeCache }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isAutoplay = searchParams.get('autoplay') === 'true'
  const initialMode = searchParams.get('mode') as 'watch' | 'listen' | null

  const [theme, setTheme] = useState(initialData)

  useEffect(() => {
    setTheme(initialData)
    setSelectedEntry(initialData.entries.find(e => e.version === 'Standard') ?? initialData.entries[0])
    setHasWatched(false)
    setUserRating(0)
    
    const m = searchParams.get('mode') as 'watch' | 'listen' | null
    if (m) setMode(m)
  }, [initialData, searchParams])

  const animeDisplayTitle = getAnimeTitle(theme)
  const songDisplayTitle = getSongTitle(theme)
  const [mode, setMode] = useState<'watch' | 'listen'>(initialMode || 'watch')
  const [selectedEntry, setSelectedEntry] = useState<IThemeEntry>(
    theme.entries.find(e => e.version === 'Standard') ?? theme.entries[0]
  )
  const [downloading, setDownloading] = useState(false)

  const fallback = getFallbackImage(theme.slug)

  const [userRating, setUserRating] = useState(0)
  const [hasWatched, setHasWatched] = useState(false)
  const [similarThemes, setSimilarThemes] = useState<IThemeCache[]>([])
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)

  const playlistId = searchParams.get('playlistId')
  const [playlist, setPlaylist] = useState<any>(null)

  useEffect(() => {
    if (playlistId) {
      fetch(`/api/playlists/${playlistId}`)
        .then(r => r.json())
        .then(json => {
          if (json.success) setPlaylist(json.data)
        })
    }
  }, [playlistId])

  const handleEnded = useCallback(() => {
    if (!playlist) return
    const currentIndex = playlist.themes.findIndex((t: any) => t.slug === theme.slug)
    if (currentIndex !== -1 && currentIndex < playlist.themes.length - 1) {
      const nextTheme = playlist.themes[currentIndex + 1]
      toast.info(`Next up: ${nextTheme.songTitle || 'Next track'}`)
      router.push(`/theme/${nextTheme.slug}?autoplay=true&mode=${mode}&playlistId=${playlistId}`)
    } else if (currentIndex === playlist.themes.length - 1) {
      toast.success('End of playlist')
    }
  }, [playlist, theme.slug, mode, playlistId, router])

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

  const categorizedThemes = useMemo(() => {
    const sameAnime: IThemeCache[] = []
    const otherSeasons: IThemeCache[] = []
    const sameArtist: IThemeCache[] = []
    const others: IThemeCache[] = []

    const baseAnimeTitle = theme.animeTitle.split(':')[0].split(' ')[0].toLowerCase()

    similarThemes.forEach(t => {
      if (t.animeTitle === theme.animeTitle) {
        sameAnime.push(t)
      } else if (t.animeTitle.toLowerCase().includes(baseAnimeTitle)) {
        otherSeasons.push(t)
      } else if (
        (t.artistName && theme.artistName && t.artistName === theme.artistName) ||
        t.allArtists.some(a => theme.allArtists.includes(a))
      ) {
        sameArtist.push(t)
      } else {
        others.push(t)
      }
    })

    return { sameAnime, otherSeasons, sameArtist, others }
  }, [similarThemes, theme])

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
      } else {
        toast.error(json.error || 'Failed to submit rating')
      }
    } catch (err) {
      toast.error('Could not submit rating. Are you logged in?')
    }
  }

  const handleDownload = async (format?: string) => {
    const url = (mode === 'listen' && format !== 'mp4') ? selectedEntry.audioUrl : selectedEntry.videoSources[0]?.url
    if (!url) return

    setDownloading(true)
    try {
      const isAudio = mode === 'listen'
      const targetFormat = format || (isAudio ? 'mp3' : 'mp4')
      
      const safeFilenameBase = `${animeDisplayTitle} - ${songDisplayTitle} (${theme.type}${theme.sequence || ''})`
        .replace(/[<>:"/\\|?*]/g, '')
      
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFilenameBase)}&format=${targetFormat}`
      
      if (targetFormat === 'mp3') {
        toast.info('Converting to MP3...', { duration: 5000 })
      } else {
        toast.info(`Fetching ${targetFormat.toUpperCase()} file...`)
      }

      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', `${safeFilenameBase}.${targetFormat}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success(`${targetFormat.toUpperCase()} ready!`)
    } catch (err: any) {
      toast.error('Download failed.')
    } finally {
      setDownloading(false)
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
    <div className="pb-20">
      <PlaylistAddModal 
        themeId={theme._id} 
        isOpen={isPlaylistModalOpen} 
        onClose={() => setIsPlaylistModalOpen(false)} 
      />
      
      {/* Immersive Video Section */}
      <div className="relative group">
        <div className="-mx-4 md:mx-0 shadow-2xl">
          <VideoPlayer 
            videoSources={selectedEntry.videoSources} 
            audioUrl={selectedEntry.audioUrl}
            poster={theme.animeCoverImage ?? fallback} 
            mode={mode} 
            themeSlug={theme.slug}
            atEntryId={selectedEntry.atEntryId}
            onWatched={handleWatched}
            onEnded={handleEnded}
            autoPlay={isAutoplay}
          />
        </div>
      </div>

      <div className="px-6 mt-10 space-y-12 max-w-2xl mx-auto">
        {/* Modern Minimal Info Header */}
        <div className="space-y-8">
          <div className="space-y-4">

            
            <div className="space-y-1">
              <Link 
                href={`/anime/${theme.anilistId}`} 
                className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-accent/70 hover:text-accent transition-colors"
              >
                {animeDisplayTitle}
              </Link>
              
              <h1 className="text-4xl md:text-6xl font-display font-black text-ktext-primary leading-[0.95] tracking-tight">
                {songDisplayTitle}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-lg font-body font-medium text-ktext-secondary">
              {theme.allArtists.map((name, i) => (
                <Link key={i} href={`/artist/${theme.artistSlugs[i]}`} className="hover:text-accent transition-colors">
                  {name}{i < theme.allArtists.length - 1 ? <span className="opacity-30 ml-2">/</span> : ''}
                </Link>
              ))}
              {!theme.allArtists.length && theme.artistName && <span>{theme.artistName}</span>}
            </div>
          </div>

          {/* Action Bar - Unified & Sleek */}
          <div className="space-y-6">
            <WatchListenToggle mode={mode} onModeChange={setMode} audioDisabled={!selectedEntry.audioUrl} />
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleDownload(mode === 'listen' ? 'mp3' : 'mp4')}
                disabled={downloading}
                className="flex-[2] h-14 flex items-center justify-center gap-3 bg-accent text-white rounded-2xl font-display font-bold text-sm tracking-widest uppercase interactive disabled:opacity-50 shadow-xl shadow-accent/25"
              >
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{mode === 'watch' ? 'Download Video' : 'Download Audio'}</span>
              </button>

              <button 
                onClick={() => {
                  if (!user) { toast.error('Please login first'); return }
                  setIsPlaylistModalOpen(true)
                }}
                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-surface border border-border-subtle text-ktext-secondary interactive hover:text-accent hover:border-accent transition-all group"
              >
                <ListMusic className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied to clipboard')
                }}
                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-surface border border-border-subtle text-ktext-secondary interactive hover:text-accent hover:border-accent transition-all group"
              >
                <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Versions & Meta */}
        {theme.entries.length > 1 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-display font-bold uppercase tracking-widest text-ktext-tertiary">Version Select</h3>
            <VersionSwitcher entries={theme.entries} selected={selectedEntry} onSelect={setSelectedEntry} />
          </div>
        )}

        {/* Minimalist Stats Bar */}
        <div className="flex items-center justify-between px-8 py-6 bg-bg-surface/30 backdrop-blur-md rounded-[32px] border border-border-subtle/50">
          {[
            { value: theme.avgRating?.toFixed(1) ?? '—', label: 'Score', color: getScoreColor(Math.round(theme.avgRating || 0)) },
            { value: formatCount(theme.totalRatings || 0), label: 'Rates' },
            { value: formatCount(theme.totalWatches || 0), label: 'Views' },
            { value: formatCount(theme.totalListens || 0), label: 'Plays' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-xl font-mono font-black tracking-tighter" style={stat.color ? { color: stat.color } : {}}>
                {stat.value}
              </span>
              <span className="text-[9px] font-display font-bold text-ktext-tertiary uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Modern Rating Widget & Comments */}
        <div className="space-y-6">
          <div className="bg-bg-surface/50 backdrop-blur-md rounded-[24px] border border-border-subtle p-5 shadow-sm">
            <RatingWidget userRating={userRating} onRate={handleRate} />
          </div>
          
          <div className="bg-bg-surface/30 backdrop-blur-sm rounded-[24px] border border-border-subtle/50 p-6">
            <CommentSection themeSlug={theme.slug} initialLimit={3} />
          </div>
        </div>

        {/* Categorized Related Themes - Minimalist Lists */}
        <div className="space-y-10 pt-4">
          {categorizedThemes.sameAnime.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] flex items-center gap-3">
                <Music className="w-3.5 h-3.5 text-accent" />
                Same Anime Themes
              </h2>
              <div className="space-y-2">
                {categorizedThemes.sameAnime.map(t => <ThemeListRow key={t.slug} {...t} />)}
              </div>
            </div>
          )}

          {categorizedThemes.otherSeasons.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] flex items-center gap-3">
                <LayoutGrid className="w-3.5 h-3.5 text-accent" />
                Franchise & Seasons
              </h2>
              <div className="space-y-2">
                {categorizedThemes.otherSeasons.map(t => <ThemeListRow key={t.slug} {...t} />)}
              </div>
            </div>
          )}

          {categorizedThemes.sameArtist.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] flex items-center gap-3">
                <Users className="w-3.5 h-3.5 text-accent" />
                More by this Artist
              </h2>
              <div className="space-y-2">
                {categorizedThemes.sameArtist.map(t => <ThemeListRow key={t.slug} {...t} />)}
              </div>
            </div>
          )}

          {categorizedThemes.others.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] flex items-center gap-3">
                <Star className="w-3.5 h-3.5 text-accent" />
                Recommended for You
              </h2>
              <div className="space-y-2">
                {categorizedThemes.others.map(t => <ThemeListRow key={t.slug} {...t} />)}
              </div>
            </div>
          )}

          {similarThemes.length === 0 && (
             <div className="py-10 text-center space-y-2 opacity-50">
                <Info className="w-8 h-8 mx-auto text-ktext-tertiary" />
                <p className="text-sm font-body text-ktext-tertiary">No related themes found for this track.</p>
             </div>
          )}
        </div>

      </div>
    </div>
  )
}

