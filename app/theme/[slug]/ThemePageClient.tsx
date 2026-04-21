'use client'
import { useState, useEffect, useCallback } from 'react'
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
import { Star, Eye, Headphones, Download, Loader2, Share2, Info, ListMusic, SkipForward } from 'lucide-react'
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
    
    // Sync mode if query param changes
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

  const handleDownload = async (format?: string) => {
    const url = (mode === 'listen' && format !== 'mp4') ? selectedEntry.audioUrl : selectedEntry.videoSources[0]?.url
    if (!url) return

    setDownloading(true)
    try {
      const isAudio = mode === 'listen'
      // If force format (like mp4 from video button) use it, otherwise detect
      const targetFormat = format || (isAudio ? 'mp3' : 'mp4')
      
      const safeFilenameBase = `${animeDisplayTitle} - ${songDisplayTitle} (${theme.type}${theme.typeIndex || ''})`
        .replace(/[<>:"/\\|?*]/g, '')
      
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFilenameBase)}&format=${targetFormat}`
      
      if (targetFormat === 'mp3') {
        toast.info('Converting to MP3... this can take 15-30s.', { duration: 5000 })
      } else {
        toast.info(`Fetching ${targetFormat.toUpperCase()} file...`)
      }

      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Server rejected download')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      const finalFilename = `${safeFilenameBase}.${targetFormat}`
      link.setAttribute('download', finalFilename)
      document.body.appendChild(link)
      link.click()
      
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success(`${targetFormat.toUpperCase()} download ready!`)
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error(err.message || 'Download failed.')
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
    <div className="pb-8">
      <PlaylistAddModal 
        themeId={theme._id} 
        isOpen={isPlaylistModalOpen} 
        onClose={() => setIsPlaylistModalOpen(false)} 
      />
      <div className="-mx-4 md:mx-0">
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

      {playlist && (
        <div className="max-w-2xl mx-auto px-4 mt-2">
          <div className="bg-bg-elevated/50 border border-border-subtle px-3 py-1.5 rounded-full flex items-center justify-between">
             <div className="flex items-center gap-2">
                <ListMusic className="w-3 h-3 text-accent" />
                <span className="text-[9px] font-display font-bold uppercase tracking-widest text-accent truncate max-w-[120px]">
                  {playlist.name}
                </span>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono font-bold text-ktext-tertiary">
                  {playlist.themes.findIndex((t: any) => t.slug === theme.slug) + 1} / {playlist.themes.length}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
             </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-6 space-y-8 max-w-2xl mx-auto">
        {/* Aesthetic Header Section */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="space-y-1">
            {hasWatched && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 bg-accent-mint/10 text-accent-mint rounded-full border border-accent-mint/20"
              >
                <Eye className="w-3 h-3" />
                <span className="text-[10px] font-display font-bold uppercase tracking-wider">Previously Watched</span>
              </motion.div>
            )}
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-display font-bold text-ktext-primary leading-tight tracking-tight px-4"
            >
              {songDisplayTitle}
            </motion.h1>
            
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-1 px-4">
              {theme.allArtists.map((name, i) => (
                <Link 
                  key={theme.artistSlugs[i] || i} 
                  href={`/artist/${theme.artistSlugs[i]}`}
                  className="text-lg font-body text-accent font-semibold hover:underline"
                >
                  {name}{i < theme.allArtists.length - 1 ? ',' : ''}
                </Link>
              ))}
              {theme.allArtists.length === 0 && theme.artistName && (
                <p className="text-lg font-body text-accent font-semibold">{theme.artistName}</p>
              )}
            </div>

            <Link 
              href={`/anime/${theme.anilistId}`} 
              className="flex items-center justify-center gap-1.5 text-sm font-body text-ktext-tertiary mt-2 hover:text-accent transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full border border-ktext-tertiary" />
              {animeDisplayTitle}
            </Link>
          </div>

          <div className="flex flex-col items-center gap-4 w-full">
            <WatchListenToggle mode={mode} onModeChange={setMode} audioDisabled={!selectedEntry.audioUrl} />
            
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence mode="wait">
                <div className="flex items-center gap-2">
                  {mode === 'listen' && selectedEntry.audioUrl && (
                    <motion.button 
                      key="dl-mp3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => handleDownload('mp3')}
                      disabled={downloading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-xs font-bold uppercase tracking-widest interactive disabled:opacity-50 shadow-md group"
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      )}
                      <span>Download MP3</span>
                    </motion.button>
                  )}

                  {mode === 'watch' && selectedEntry.videoSources.length > 0 && (
                    <motion.button 
                      key="dl-video"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => handleDownload('mp4')}
                      disabled={downloading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-bg-elevated border border-border-subtle text-ktext-primary text-xs font-bold uppercase tracking-widest interactive hover:border-accent disabled:opacity-50 group"
                    >
                      {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      )}
                      <span>Download Video</span>
                    </motion.button>
                  )}

                  <button 
                    onClick={() => {
                      if (!user) {
                        toast.error('Please login to manage playlists')
                        return
                      }
                      setIsPlaylistModalOpen(true)
                    }}
                    className="flex items-center justify-center p-2.5 rounded-full bg-bg-surface border border-border-default text-ktext-secondary interactive hover:text-accent hover:border-accent transition-all duration-300"
                    title="Add to Playlist"
                  >
                    <ListMusic className="w-5 h-5" />
                  </button>
                </div>
              </AnimatePresence>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-[10px] font-body text-ktext-tertiary italic text-center px-8 opacity-70"
              >
                Buffering a lot? Download it for a smoother experience.
              </motion.p>
            </div>
          </div>
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

        <CommentSection themeSlug={theme.slug} />

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
