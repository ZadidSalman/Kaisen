'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, Loader2, ListMusic, Check } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface PlaylistAddModalProps {
  themeId: string
  isOpen: boolean
  onClose: () => void
}

export function PlaylistAddModal({ themeId, isOpen, onClose }: PlaylistAddModalProps) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const fetchPlaylists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetch('/api/playlists')
      const json = await res.json()
      if (json.success) {
        setPlaylists(json.data)
      }
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        console.error('Failed to fetch playlists:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists()
    }
  }, [isOpen, fetchPlaylists])

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      const res = await authFetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', themeId })
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Added to ${playlists.find(p => p._id === playlistId)?.name}`)
        onClose()
      } else {
        toast.error(json.error || 'Failed to add to playlist')
      }
    } catch (err) {
      toast.error('Failed to add to playlist')
    }
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return

    setCreating(true)
    try {
      const res = await authFetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName })
      })
      const json = await res.json()
      if (json.success) {
        setPlaylists([json.data, ...playlists])
        setNewPlaylistName('')
        toast.success('Playlist created!')
        // Automatically add to the new playlist
        handleAddToPlaylist(json.data._id)
      }
    } catch (err) {
      toast.error('Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-bg-surface rounded-[32px] border border-border-subtle shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-container flex items-center justify-center">
              <ListMusic className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-display font-bold text-ktext-primary">Add to Playlist</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-elevated text-ktext-secondary interactive transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : playlists.length > 0 ? (
            <div className="space-y-1">
              {playlists.map(p => {
                const alreadyAdded = p.themes.includes(themeId)
                return (
                  <button
                    key={p._id}
                    onClick={() => !alreadyAdded && handleAddToPlaylist(p._id)}
                    disabled={alreadyAdded}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all interactive
                      ${alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-elevated'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-xs font-mono font-bold text-ktext-tertiary">
                         {p.themes.length}
                      </div>
                      <span className="font-body font-semibold text-ktext-primary truncate">{p.name}</span>
                    </div>
                    {alreadyAdded && <Check className="w-4 h-4 text-accent-mint" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center px-6">
              <p className="text-sm font-body text-ktext-tertiary italic">No playlists yet. Create one below!</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-subtle bg-bg-elevated/50">
          <form onSubmit={handleCreatePlaylist} className="relative">
            <input
              type="text"
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-bg-surface border border-border-default rounded-2xl py-3 pl-4 pr-12 text-sm font-body focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={creating || !newPlaylistName.trim()}
              className="absolute right-2 top-1.5 p-2 rounded-xl bg-accent text-white disabled:opacity-50 interactive shadow-lg shadow-accent/20"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
