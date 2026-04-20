'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { authFetch } from '@/lib/auth-client'
import { getFallbackAvatar } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Send, MessageSquare, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface User {
  username: string
  displayName: string
  avatarUrl?: string
}

interface Comment {
  _id: string
  userId: User
  content: string
  createdAt: string
}

export function CommentSection({ themeSlug }: { themeSlug: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/themes/${themeSlug}/comments`)
        const json = await res.json()
        if (json.success) {
          setComments(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
  }, [themeSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please login to comment')
      return
    }
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const res = await authFetch(`/api/themes/${themeSlug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (json.success) {
        setComments(prev => [json.data, ...prev])
        setContent('')
        toast.success('Comment posted!')
      } else {
        toast.error(json.error || 'Failed to post comment')
      }
    } catch (err) {
      toast.error('Could not post comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-8 border-t border-border-subtle mt-10">
      <h2 className="text-sm font-display font-bold text-ktext-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        Comments ({comments.length})
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden border border-border-subtle relative flex-shrink-0">
               <Image 
                 src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
                 alt="your avatar" 
                 fill 
                 className="object-cover" 
                 unoptimized 
                 referrerPolicy="no-referrer" 
               />
            </div>
            <div className="flex-1 relative group">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Share your thoughts on this theme..."
                className="w-full bg-bg-surface border border-border-default rounded-[16px] px-4 py-3 text-sm font-body text-ktext-primary outline-none focus:border-accent transition-all resize-none min-h-[100px] shadow-sm group-hover:border-border-strong"
                maxLength={1000}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold ${content.length > 900 ? 'text-error' : 'text-ktext-tertiary'}`}>
                  {content.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center interactive disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 transition-transform"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-8 bg-bg-surface border border-dashed border-border-default rounded-[24px] text-center">
          <p className="text-sm font-body text-ktext-tertiary italic">
            Please <Link href="/login" className="text-accent font-bold hover:underline">login</Link> to join the conversation.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-bg-elevated" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-bg-elevated rounded" />
                  <div className="h-16 bg-bg-elevated rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {comments.map(comment => (
              <div key={comment._id} className="flex gap-4 group">
                <Link href={`/user/${comment.userId.username}`} className="w-10 h-10 rounded-full bg-bg-elevated overflow-hidden border border-border-subtle relative flex-shrink-0 interactive mt-1">
                  <Image 
                    src={comment.userId.avatarUrl ?? getFallbackAvatar(comment.userId.username)} 
                    alt={comment.userId.displayName} 
                    fill 
                    className="object-cover" 
                    unoptimized 
                    referrerPolicy="no-referrer" 
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Link href={`/user/${comment.userId.username}`} className="text-sm font-display font-bold text-ktext-primary hover:text-accent transition-colors">
                      {comment.userId.displayName}
                    </Link>
                    <span className="text-[10px] font-mono font-bold text-ktext-tertiary uppercase flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="bg-bg-surface border border-border-subtle rounded-[20px] rounded-tl-none p-4 shadow-sm group-hover:border-border-default transition-colors">
                    <p className="text-[15px] font-body text-ktext-secondary whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-border-default">
              <MessageSquare className="w-8 h-8 text-ktext-disabled opacity-30" />
            </div>
            <p className="text-sm font-body text-ktext-tertiary italic">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  )
}
