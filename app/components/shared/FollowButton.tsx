'use client'
import { useState, useEffect } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface FollowButtonProps {
  username: string
  label?: string
  compact?: boolean
  onToggle?: (isFollowing: boolean) => void
}

export function FollowButton({ username, label = 'Follow', compact = false, onToggle }: FollowButtonProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      if (!user || user.username === username) {
        setChecking(false)
        return
      }
      try {
        const res = await authFetch(`/api/follow/${username}`)
        const data = await res.json()
        if (data.success) {
          setIsFollowing(data.isFollowing)
        }
      } catch (err) {
        console.error('Failed to check follow status:', err)
      } finally {
        setChecking(false)
      }
    }
    checkStatus()
  }, [username, user])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      toast.error('Please login to follow')
      return
    }
    
    if (user.username === username) return

    setLoading(true)
    try {
      const res = await authFetch(`/api/follow/${username}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })
      const data = await res.json()
      if (data.success) {
        const nextState = !isFollowing
        setIsFollowing(nextState)
        onToggle?.(nextState)
        toast.success(isFollowing ? `Unfollowed ${username}` : `Following ${username}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  if (user?.username === username) return null
  if (checking) return <div className={`${compact ? 'h-8 w-20' : 'h-11 w-32'} bg-bg-elevated animate-pulse rounded-full`} />

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        flex items-center justify-center gap-1.5 rounded-full font-body font-semibold transition-all duration-150 interactive
        ${compact ? 'h-8 px-3 text-[10px]' : 'h-11 px-6 text-sm'}
        ${isFollowing
          ? 'bg-accent-container text-accent border border-border-accent hover:bg-accent-subtle'
          : 'bg-accent text-white hover:bg-accent-hover shadow-sm'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? (
        <Loader2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />
      ) : isFollowing ? (
        <>
          <Check className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          {compact ? 'Following' : 'Following'}
        </>
      ) : (
        <>
          <Plus className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          {label}
        </>
      )}
    </button>
  )
}
