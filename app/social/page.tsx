'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { timeAgo } from '@/lib/utils'
import { ChevronLeft, Loader2, Users } from 'lucide-react'
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

export default function SocialPage() {
  const router = useRouter()

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: queryKeys.friends.socialFeed(),
    queryFn: async () => {
      try {
        const res = await authFetch('/api/social/friends-activity?limit=50')
        const json = await res.json()
        return json.success ? json.data : []
      } catch (err) {
        console.error('Failed to fetch social feed:', err)
        return []
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  return (
    <div className="min-h-screen bg-bg-surface pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-surface/80 backdrop-blur-md px-4 py-4 flex items-center gap-4 border-b border-white/5">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full bg-bg-elevated text-ktext-primary interactive"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-ktext-primary">Friend Activity</h1>
          <p className="text-xs font-body text-ktext-secondary">See what everyone is up to</p>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-ktext-secondary font-body">Catching up with friends...</p>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-accent-container/40 rounded-[28px] border border-white/5">
                <Link href={`/user/${activity.user.username}`} className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-accent/20 interactive">
                  <Image 
                    src={activity.user.avatar} 
                    fill 
                    className="object-cover" 
                    alt={activity.user.displayName}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-ktext-secondary">
                    <Link href={`/user/${activity.user.username}`} className="font-bold text-ktext-primary hover:text-accent transition-colors">
                      {activity.user.displayName}
                    </Link>
                    {' '}
                    {activity.type === 'listening' ? 'is listening to' : activity.type === 'liked' ? 'liked' : 'rated'}
                  </p>
                  <Link href={`/theme/${activity.item.slug}`}>
                    <p className="text-base font-display font-bold text-accent truncate hover:underline">
                      {activity.item.title}
                    </p>
                  </Link>
                </div>
                <div className="text-[11px] font-body text-ktext-tertiary whitespace-nowrap opacity-80 bg-bg-elevated/50 px-2 py-1 rounded-full">
                  {timeAgo(activity.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-ktext-disabled" />
            </div>
            <p className="text-base font-display font-bold text-ktext-primary">No Activity Yet</p>
            <p className="text-sm font-body text-ktext-secondary mt-1">Follow some friends to see their activity here!</p>
            <Link href="/search" className="mt-6 px-6 py-2 bg-accent text-white rounded-full font-body font-bold interactive">
              Find People
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
