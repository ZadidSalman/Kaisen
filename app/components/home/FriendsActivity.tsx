'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { timeAgo } from '@/lib/utils'
import { Loader2, Users } from 'lucide-react'
import { authFetch } from '@/lib/auth-client'

interface Activity {
  id: string
  user: {
    username: string
    avatar: string
    displayName: string
  }
  type: 'listening' | 'liked' | 'rated'
  item: {
    title: string
    slug: string
  }
  timestamp: string
}

export function FriendsActivity() {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: queryKeys.friends.socialFeed(),
    queryFn: async () => {
      try {
        const res = await authFetch('/api/social/friends-activity')
        const json = await res.json()
        return json.success ? json.data : []
      } catch (err) {
        console.error('Failed to fetch social feed:', err)
        return []
      }
    },
    staleTime: 60 * 1000, // 1 minute
  })

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-display font-bold text-ktext-primary">Friends Activity</h2>
        <div className="bg-accent-container/30 rounded-[32px] p-10 flex flex-col items-center justify-center">
          <Loader2 className="w-6 h-6 text-accent animate-spin mb-2" />
          <p className="text-sm font-body text-ktext-tertiary">Catching up with friends...</p>
        </div>
      </section>
    )
  }

  if (activities.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold text-ktext-primary">Friends Activity</h2>
          <Link href="/search" className="text-sm font-body text-accent font-semibold interactive">
            Find Friends
          </Link>
        </div>
        <div className="bg-accent-container/30 rounded-[32px] p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-bg-surface flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-ktext-disabled" />
          </div>
          <p className="text-sm font-body text-ktext-secondary font-medium">No activity from friends yet.</p>
          <p className="text-xs font-body text-ktext-tertiary mt-1">Follow some people to see what they&apos;re listening to!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-ktext-primary">Friends Activity</h2>
        <Link href="/social" className="text-sm font-body text-accent font-semibold interactive">
          View Full Feed
        </Link>
      </div>

      <div className="bg-accent-container/30 rounded-[32px] p-5 space-y-5">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3">
            <Link href={`/user/${activity.user.username}`} className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-white/50 interactive">
              <Image 
                src={activity.user.avatar} 
                fill 
                className="object-cover" 
                alt={activity.user.displayName}
              />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-body text-ktext-tertiary">
                <Link href={`/user/${activity.user.username}`} className="font-bold text-ktext-primary hover:text-accent transition-colors">
                  {activity.user.displayName}
                </Link>
                {' '}
                {activity.type === 'listening' ? 'is listening to' : activity.type === 'liked' ? 'liked' : 'rated'}
              </p>
              <Link href={`/theme/${activity.item.slug}`}>
                <p className="text-sm font-display font-bold text-accent truncate hover:underline">
                  {activity.item.title}
                </p>
              </Link>
            </div>
            <div className="text-[10px] font-body text-ktext-tertiary whitespace-nowrap opacity-70">
              {timeAgo(activity.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
