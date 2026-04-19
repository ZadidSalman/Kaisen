'use client'
import { useState, useEffect } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

interface FollowButtonProps {
  username: string
  label?: string
}

export function FollowButton({ username, label = 'Follow' }: FollowButtonProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setChecking(false)
        return
      }
      try {
        const res = await fetch(`/api/follow/${username}`)
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

  const handleToggle = async () => {
    if (!user) {
      toast.error('Please login to follow')
      return
    }
    
    setLoading(true)
    try {
      const res = await authFetch(`/api/follow/${username}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setIsFollowing(!isFollowing)
        toast.success(isFollowing ? `Unfollowed ${username}` : `Following ${username}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return <div className="h-11 w-32 bg-bg-elevated animate-pulse rounded-full" />

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        flex items-center gap-2 h-11 px-6 rounded-full font-body font-semibold text-sm
        transition-all duration-150 interactive
        ${isFollowing
          ? 'bg-accent-container text-accent border border-border-accent'
          : 'bg-accent text-white hover:bg-accent-hover shadow-md'
        }
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  )
}
