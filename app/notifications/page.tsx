'use client'

import { Bell, Heart, UserPlus, Zap, MessageSquare, ArrowLeft, CheckCheck, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, markNotificationsRead } from '@/lib/api/notifications'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface NotificationActor {
  username: string
  displayName: string
  avatarUrl?: string
}

interface NotificationData {
  _id: string
  type: 'follow' | 'theme_rated' | 'theme_favorited' | 'comment' | 'rating_like' | 'playlist_like'
  actorId: NotificationActor
  read: boolean
  createdAt: string
  entityMeta?: any
}

const getNotificationConfig = (type: NotificationData['type']) => {
  switch (type) {
    case 'follow':
      return {
        icon: UserPlus,
        color: 'text-blue-400',
        action: 'started following you',
      }
    case 'theme_favorited':
      return {
        icon: Heart,
        color: 'text-pink-500',
        action: 'favorited a theme',
      }
    case 'theme_rated':
      return {
        icon: Zap,
        color: 'text-yellow-400',
        action: 'rated a theme',
      }
    case 'comment':
      return {
        icon: MessageSquare,
        color: 'text-green-400',
        action: 'commented on your post',
      }
    case 'rating_like':
      return {
        icon: Heart,
        color: 'text-pink-400',
        action: 'liked your rating',
      }
    case 'playlist_like':
      return {
        icon: Heart,
        color: 'text-red-400',
        action: 'liked your playlist',
      }
    default:
      return {
        icon: Bell,
        color: 'text-ktext-tertiary',
        action: 'sent a notification',
      }
  }
}

export default function NotificationPage() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading, error } = useQuery<NotificationData[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  })

  const markReadMutation = useMutation({
    mutationFn: () => markNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All marked as read')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to mark as read')
    }
  })

  const handleMarkAllRead = () => {
    if (!notifications || notifications.every(n => n.read)) return
    markReadMutation.mutate()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-display font-bold text-ktext-primary mb-2">Failed to load</h2>
        <p className="text-ktext-secondary max-w-xs mx-auto mb-6">
          There was an error loading your notifications. Please try again later.
        </p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
          className="px-6 py-2.5 rounded-full bg-accent text-white font-bold interactive shadow-lg shadow-accent/20"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center border border-border-subtle interactive group"
          >
            <ArrowLeft className="w-5 h-5 text-ktext-secondary group-hover:text-ktext-primary transition-colors" />
          </Link>
          <h1 className="text-3xl font-display font-black text-ktext-primary italic tracking-tight">
            Notifications
          </h1>
        </div>

        {notifications && notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markReadMutation.isPending || notifications.every(n => n.read)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle 
              text-sm font-bold transition-all duration-200
              ${notifications.every(n => n.read) 
                ? 'opacity-40 cursor-not-allowed' 
                : 'bg-bg-surface text-ktext-secondary hover:text-accent hover:border-accent/30 interactive'}
            `}
          >
            {markReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[24px] bg-bg-surface border border-border-subtle animate-pulse" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications?.map((notif, i) => {
              const config = getNotificationConfig(notif.type)
              return (
                <motion.div
                  key={notif._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={`
                    group p-4 rounded-[24px] border transition-all duration-300
                    ${!notif.read 
                      ? 'bg-accent/5 border-accent/20 shadow-lg shadow-accent/5' 
                      : 'bg-bg-surface border-border-subtle hover:border-accent/30'}
                    flex gap-4 items-start relative overflow-hidden
                  `}
                >
                  {!notif.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_rgba(255,46,108,0.6)]" />
                  )}
                  
                  <div className={`
                    w-12 h-12 rounded-2xl bg-bg-elevated flex items-center justify-center shrink-0
                    border border-border-subtle group-hover:scale-105 transition-transform duration-300
                  `}>
                    <config.icon className={`w-6 h-6 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-ktext-primary font-body leading-snug">
                      <Link 
                        href={`/profile/${notif.actorId.username}`}
                        className="font-bold hover:text-accent transition-colors"
                      >
                        {notif.actorId.displayName}
                      </Link>
                      <span className="text-ktext-secondary text-sm ml-1"> @{notif.actorId.username}</span>
                      <br />
                      <span className="text-ktext-primary">{config.action} </span>
                      {notif.entityMeta?.targetName && (
                        <span className="text-accent font-bold cursor-pointer hover:underline">
                          {notif.entityMeta.targetName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ktext-tertiary mt-2 flex items-center gap-2">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      {!notif.read && (
                        <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[10px] font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {!isLoading && notifications?.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center mb-6 border border-border-subtle">
            <Bell className="w-10 h-10 text-ktext-tertiary opacity-30" />
          </div>
          <h2 className="text-xl font-display font-bold text-ktext-primary mb-2">No notifications yet</h2>
          <p className="text-ktext-secondary max-w-xs">
            When you get new followers or likes, they'll show up here!
          </p>
        </motion.div>
      )}
    </div>
  )
}
