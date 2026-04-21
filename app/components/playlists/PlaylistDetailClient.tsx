'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { ListMusic, Play, Calendar, Music2, ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'
import { useAuth } from '@/hooks/useAuth'
import { usePlayer } from '@/app/context/PlayerContext'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function PlaylistDetailClient({ id }: { id: string }) {
  const { user } = useAuth()
  const { playTheme } = usePlayer()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await fetch(`/api/playlists/${id}`)
      const json = await res.json()
      if (json.success) setPlaylist(json.data)
      else throw new Error(json.error)
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch playlist')
      router.push('/playlists')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchPlaylist()
  }, [fetchPlaylist])

  const handleRemoveTheme = async (themeId: string) => {
    try {
      const res = await authFetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', themeId })
      })
      const json = await res.json()
      if (json.success) {
        setPlaylist({
          ...playlist,
          themes: playlist.themes.filter((t: any) => t._id !== themeId)
        })
        toast.success('Removed from playlist')
      }
    } catch (err) {
      toast.error('Failed to remove theme')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    )
  }

  if (!playlist) return null

  const isOwner = user && user._id === playlist.userId

  return (
    <div className="pt-4 pb-20 space-y-8 animate-in fade-in duration-500">
      <Link 
        href="/playlists" 
        className="inline-flex items-center gap-2 text-sm font-body text-ktext-tertiary hover:text-accent transition-colors interactive"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Playlists
      </Link>

      <header className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
        <div className="w-40 h-40 rounded-[40px] bg-accent-container flex items-center justify-center shadow-lg ring-1 ring-accent/10">
          <ListMusic className="w-20 h-20 text-accent" />
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black text-ktext-primary tracking-tight leading-none">
              {playlist.name}
            </h1>
            <p className="text-ktext-secondary font-body mt-2">
              {playlist.description || 'Custom collection of anime themes'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-body text-ktext-tertiary">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4" />
              <span className="font-bold text-ktext-secondary">{playlist.themes.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Created {format(new Date(playlist.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {playlist.themes.length > 0 && (
            <button 
              onClick={() => playTheme(playlist.themes[0], playlist.themes)}
              className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-full font-body font-bold interactive shadow-lg shadow-accent/20"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
              Play All (Audio)
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {playlist.themes.length > 0 ? (
          playlist.themes.map((theme: any) => (
            <div key={theme.slug} className="group relative">
               <ThemeListRow {...theme} />
               {isOwner && (
                 <button 
                  onClick={() => handleRemoveTheme(theme._id)}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity interactive"
                  title="Remove from playlist"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-bg-surface rounded-[32px] border border-dashed border-border-default">
            <p className="text-ktext-tertiary font-body italic">This playlist is empty. Add some themes to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
