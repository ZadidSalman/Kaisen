'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Link2, RefreshCw, Library } from 'lucide-react'
import { toast } from 'sonner'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { fetchLibraryThemes } from '@/lib/api/themes'
import { useAuth } from '@/hooks/useAuth'
import { setAccessToken } from '@/lib/auth-client'

export function LibraryClient() {
  const { user, refreshUser } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['themes', 'library'],
    queryFn: fetchLibraryThemes,
    enabled: !!user?.anilist?.accessToken,
  })

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.accessToken
        if (token) setAccessToken(token)
        
        toast.success(user ? 'AniList connected successfully!' : 'Logged in with AniList!')
        refreshUser()
        setIsConnecting(false)
        refetch()
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        toast.error(`Auth failed: ${event.data.error}`)
        setIsConnecting(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refreshUser, refetch, user])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/auth/anilist/url')
      const { url, error } = await res.json()
      if (error) throw new Error(error)

      window.open(url, 'anilist_auth', 'width=600,height=700')
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize AniList connection')
      setIsConnecting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-bg-elevated rounded-full flex items-center justify-center mb-6">
          <Library className="w-10 h-10 text-ktext-tertiary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ktext-primary mb-2">My Library</h1>
        <p className="text-ktext-secondary mb-8 max-w-sm">
          Log in with AniList to immediately see themes from your completed anime list.
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-[#3dbbee] text-white px-8 py-3 rounded-full font-body font-bold interactive disabled:opacity-50"
        >
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login with AniList'}
        </button>
      </div>
    )
  }

  if (!user.anilist?.accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-bg-elevated rounded-full flex items-center justify-center mb-6">
          <Link2 className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-2xl font-display font-bold text-ktext-primary mb-2">Connect AniList</h1>
        <p className="text-ktext-secondary mb-8 max-w-sm">
          Sync your AniList profile to automatically see all OPs and EDs from your completed anime.
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-accent text-white px-8 py-3 rounded-full font-body font-bold interactive disabled:opacity-50"
        >
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect Now'}
        </button>
      </div>
    )
  }

  const themes = data?.data || []
  const anilistUser = data?.meta?.anilistUser

  return (
    <div className="pt-4 pb-20 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ktext-primary">Your Library</h1>
          <p className="text-xs text-ktext-tertiary font-body uppercase tracking-wider mt-1">
            Synced with AniList: <span className="text-accent font-bold">{anilistUser}</span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-ktext-secondary hover:text-accent transition-colors interactive"
          title="Refresh List"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-bg-elevated rounded-2xl shimmer" />
          ))}
        </div>
      ) : themes.length > 0 ? (
        <div className="space-y-3">
          {themes.map((theme: any) => (
            <ThemeListRow key={theme.slug} {...theme} />
          ))}
          <p className="text-center py-8 text-sm text-ktext-tertiary font-body">
            Showing {themes.length} themes from your completed list.
          </p>
        </div>
      ) : (
        <div className="text-center py-20 px-6 bg-bg-elevated rounded-3xl">
          <p className="text-ktext-secondary">
            No themes found for your completed anime. 
            Make sure your list is public and &quot;Completed&quot; entries exist on AniList.
          </p>
        </div>
      )}
    </div>
  )
}
