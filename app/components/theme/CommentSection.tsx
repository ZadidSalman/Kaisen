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
import { motion, AnimatePresence } from 'motion/react'

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

export function CommentSection({ themeSlug, initialLimit }: { themeSlug: string, initialLimit?: number }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)

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
        setShowForm(false)
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

  const displayedComments = (initialLimit && !isExpanded) ? comments.slice(0, initialLimit) : comments
  const hasMore = initialLimit && comments.length > initialLimit && !isExpanded

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-display font-bold text-ktext-secondary uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          Comments ({comments.length})
        </h2>
        
        {user && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="text-xs font-display font-bold text-accent hover:underline uppercase tracking-widest"
          >
            Add Comment
          </button>
        )}
      </div>

      <AnimatePresence>
        {user && showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} 
            className="mb-8 overflow-hidden"
          >
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
                  autoFocus
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
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-bg-elevated" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-bg-elevated rounded" />
                  <div className="h-10 bg-bg-elevated rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <>
            <div className="space-y-5">
              {displayedComments.map((comment, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={comment._id} 
                  className="flex gap-4 group"
                >
                  <Link href={`/user/${comment.userId.username}`} className="w-9 h-9 rounded-full bg-bg-elevated overflow-hidden border border-border-subtle relative flex-shrink-0 interactive mt-1">
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
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/user/${comment.userId.username}`} className="text-xs font-display font-bold text-ktext-primary hover:text-accent transition-colors">
                        {comment.userId.displayName}
                      </Link>
                      <span className="text-[9px] font-mono font-bold text-ktext-tertiary uppercase flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="bg-bg-surface/50 border border-border-subtle rounded-[16px] rounded-tl-none p-3 shadow-sm group-hover:border-border-default transition-colors">
                      <p className="text-sm font-body text-ktext-secondary whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="w-full py-3 bg-bg-elevated border border-border-subtle rounded-xl text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] hover:bg-bg-surface hover:text-accent transition-all mt-2"
              >
                View All {comments.length} Comments
              </button>
            )}
            
            {isExpanded && comments.length > (initialLimit || 0) && (
               <button 
                 onClick={() => setIsExpanded(false)}
                 className="w-full py-3 text-xs font-display font-bold text-ktext-tertiary uppercase tracking-[0.2em] hover:text-accent transition-all mt-2"
               >
                 Show Less
               </button>
            )}
          </>
        ) : (
          <div className="py-10 text-center">
            <p className="text-xs font-body text-ktext-tertiary italic">No comments yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
