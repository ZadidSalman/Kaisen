'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { ListMusic, Plus, Loader2, Play, Music2, Calendar, Globe, Lock, Trash2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function PlaylistsClient() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await authFetch('/api/playlists')
      const json = await res.json()
      if (json.success) setPlaylists(json.data)
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        console.error('Failed to fetch playlists:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchPlaylists()
    } else {
      setLoading(false)
    }
  }, [user, fetchPlaylists])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await authFetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const json = await res.json()
      if (json.success) {
        setPlaylists([json.data, ...playlists])
        setName('')
        setShowCreate(false)
        toast.success('Playlist created!')
      }
    } catch (err) {
      toast.error('Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this playlist?')) return

    try {
      const res = await authFetch(`/api/playlists/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setPlaylists(playlists.filter(p => p._id !== id))
        toast.success('Playlist deleted')
      }
    } catch (err) {
      toast.error('Failed to delete playlist')
    }
  }

  if (!user && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-bg-elevated rounded-[32px] flex items-center justify-center mb-6">
          <ListMusic className="w-10 h-10 text-ktext-tertiary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ktext-primary mb-2">My Playlists</h1>
        <p className="text-ktext-secondary mb-8 max-w-sm font-body">
          Sign in to create your own collections of your favorite anime themes.
        </p>
        <Link 
          href="/login" 
          className="bg-accent text-white px-8 py-3 rounded-full font-body font-bold interactive shadow-lg shadow-accent/20"
        >
          Get Started
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-4 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black text-ktext-primary tracking-tight">Playlists</h1>
          <p className="text-ktext-secondary font-body">Your curated collections</p>
        </div>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-2xl font-body font-bold interactive shadow-lg shadow-accent/20"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Playlist</span>
        </button>
      </header>

      <AnimatePresence>
        {showCreate && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="bg-bg-surface p-6 rounded-[24px] border border-accent/20 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-xs font-display font-bold text-accent uppercase tracking-wider ml-1">Playlist Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Best 90s Openings"
                  className="w-full bg-bg-elevated border border-border-default rounded-2xl py-3 px-4 text-sm font-body focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full sm:w-auto bg-accent text-white px-8 py-3 rounded-2xl font-body font-bold interactive disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-[32px] bg-bg-elevated shimmer" />
          ))
        ) : playlists.length > 0 ? (
          playlists.map((playlist) => (
            <Link 
              key={playlist._id} 
              href={`/playlists/${playlist._id}`}
              className="group bg-bg-surface p-6 rounded-[32px] border border-border-subtle shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all interactive flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-accent-container flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <ListMusic className="w-7 h-7 text-accent" />
                </div>
                <div className="flex items-center gap-2">
                   {playlist.isPublic ? <Globe className="w-3.5 h-3.5 text-ktext-tertiary" /> : <Lock className="w-3.5 h-3.5 text-ktext-tertiary" />}
                   <button 
                    onClick={(e) => handleDelete(e, playlist._id)}
                    className="p-2 rounded-full hover:bg-red-500/10 text-ktext-tertiary hover:text-red-500 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="text-xl font-display font-bold text-ktext-primary group-hover:text-accent transition-colors truncate">
                  {playlist.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-body text-ktext-tertiary">
                  <Music2 className="w-3.5 h-3.5" />
                  <span>{playlist.themes.length} items</span>
                  <span className="opacity-40">•</span>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(new Date(playlist.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(playlist.themes.length, 3))].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-accent-container border-2 border-bg-surface ring-1 ring-accent/10" />
                  ))}
                </div>
                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-accent/20">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 px-8 bg-bg-surface rounded-[40px] border border-dashed border-border-default flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mb-4">
               <Music2 className="w-8 h-8 text-ktext-tertiary opacity-40" />
            </div>
            <p className="text-ktext-secondary font-body">No playlists found. Create your first collection above!</p>
          </div>
        )}
      </div>
    </div>
  )
}
