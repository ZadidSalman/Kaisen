'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Pencil, MessageCircle, MoreVertical, History, Activity as ActivityIcon, Users, Star, Clock, Heart } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { formatCount, getScoreColor, formatDuration, getFallbackAvatar } from '@/lib/utils'
import { FollowButton } from '@/app/components/shared/FollowButton'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import Link from 'next/link'

type Tab = 'activity' | 'history' | 'friends' | 'ratings'

export function ProfileClient({ initialData }: { initialData: any }) {
  const { user: currentUser } = useAuth()
  const isOwn = currentUser?.username === initialData.username
  
  const [activeTab, setActiveTab] = useState<Tab>('activity')
  const [data, setData] = useState<any>({
    activity: [],
    history: [],
    friends: { followers: [], following: [] },
    ratings: []
  })
  const [loading, setLoading] = useState(true)

  const profileFallback = getFallbackAvatar(initialData.username)

  useEffect(() => {
    async function fetchTabData() {
      setLoading(true)
      try {
        let endpoint = ''
        if (activeTab === 'activity') endpoint = `/api/users/${initialData.username}/activity`
        else if (activeTab === 'history') endpoint = `/api/users/${initialData.username}/history`
        else if (activeTab === 'ratings') endpoint = `/api/users/${initialData.username}/ratings`
        else if (activeTab === 'friends') endpoint = `/api/users/${initialData.username}/friends`
        
        if (endpoint) {
          const res = await fetch(endpoint)
          const json = await res.json()
          if (json.success) {
            setData((prev: any) => ({ ...prev, [activeTab]: json.data }))
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${activeTab}:`, err)
      } finally {
        setLoading(false)
      }
    }
    fetchTabData()
  }, [activeTab, initialData.username])

  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const tabs = [
    { id: 'activity', label: 'Activity', icon: ActivityIcon },
    { id: 'history', label: 'History', icon: History },
    { id: 'ratings', label: 'Ratings', icon: Star },
    { id: 'friends', label: 'Friends', icon: Users },
  ]

  return (
    <div className="pb-20">
      <div className="flex flex-col items-center text-center pt-8 pb-4 space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-accent-mint ring-offset-2 ring-offset-bg-base shadow-lg relative">
            <Image 
              src={initialData.avatarUrl ?? profileFallback} 
              fill
              unoptimized
              className="object-cover" 
              alt={initialData.displayName} 
              referrerPolicy="no-referrer"
            />
          </div>
          {isOwn && (
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full
                                bg-accent-mint flex items-center justify-center border-2 border-bg-base shadow-sm interactive z-10">
              <Pencil className="w-4 h-4 text-on-accent-mint" />
            </button>
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-display font-bold text-ktext-primary tracking-tight">{initialData.displayName}</h1>
          <p className="text-sm font-body text-ktext-secondary mt-1 max-w-[320px] leading-relaxed mx-auto">
            {initialData.bio || (isOwn ? 'Add a bio to your profile to let others know what you like!' : 'No bio yet')}
          </p>
        </div>

        {isOwn ? (
          <button className="px-8 h-11 bg-bg-surface border border-border-default
                             text-ktext-primary font-body font-semibold rounded-full interactive transition-all hover:bg-bg-elevated">
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <FollowButton username={initialData.username} label="Follow User" />
            <button className="w-11 h-11 bg-bg-elevated border border-border-default
                                text-ktext-primary flex items-center justify-center rounded-full interactive">
              <MessageCircle className="w-5 h-5 opacity-70" />
            </button>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm pt-4">
          {[
            { label: 'LISTEN TIME', value: formatTimeSpent(initialData.totalTime || 0) },
            { label: 'FOLLOWERS', value: formatCount(initialData.totalFollowers) },
            { label: 'FOLLOWING', value: formatCount(initialData.totalFollowing) },
          ].map(stat => (
            <div key={stat.label} className="flex-1 bg-bg-surface border border-border-subtle rounded-[20px] p-3 text-center shadow-sm">
              <p className="text-xl font-display font-bold text-accent">{stat.value}</p>
              <p className="text-[10px] font-body text-ktext-tertiary tracking-widest font-black">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b border-border-subtle mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-display font-bold transition-all relative
                ${activeTab === tab.id ? 'text-accent' : 'text-ktext-tertiary hover:text-ktext-secondary'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" 
                />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-10 h-10 border-4 border-border-accent border-t-accent rounded-full animate-spin mb-4" />
              <p className="text-sm font-body text-ktext-tertiary">Loading profile data...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {data.activity.length > 0 ? (
                    data.activity.map((item: any, idx: number) => (
                      <ActivityCard key={idx} item={item} />
                    ))
                  ) : (
                    <EmptyState message="No recent activity to show" />
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2">
                  {data.history.length > 0 ? (
                    data.history.map((item: any, idx: number) => (
                      <div key={idx} className="relative group">
                         <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-ktext-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx + 1}
                         </div>
                         <ThemeListRow {...item.themeId} />
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Watch history is empty" />
                  )}
                </div>
              )}

              {activeTab === 'ratings' && (
                <div className="space-y-4">
                  {data.ratings.length > 0 ? (
                    data.ratings.map((item: any, idx: number) => (
                      <ActivityCard key={idx} item={{ ...item, activityType: 'rating', date: item.createdAt }} />
                    ))
                  ) : (
                    <EmptyState message="No ratings yet" />
                  )}
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-display font-bold text-ktext-secondary mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-mint" />
                      Following ({data.friends.following.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.friends.following.length > 0 ? (
                        data.friends.following.map((u: any) => <UserCard key={u.username} user={u} />)
                      ) : (
                        <p className="text-sm font-body text-ktext-tertiary italic px-4">Not following anyone yet.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-display font-bold text-ktext-secondary mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-ed" />
                      Followers ({data.friends.followers.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.friends.followers.length > 0 ? (
                        data.friends.followers.map((u: any) => <UserCard key={u.username} user={u} />)
                      ) : (
                        <p className="text-sm font-body text-ktext-tertiary italic px-4">No followers yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivityCard({ item }: { item: any }) {
  const isRating = item.activityType === 'rating'
  
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-[24px] p-4 shadow-sm hover:shadow-card-hover transition-all group">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isRating ? 'bg-accent-container' : 'bg-accent-mint-container'}`}>
          {isRating ? <Star className="w-5 h-5 text-accent fill-current" /> : <Clock className="w-5 h-5 text-accent-mint" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-sm font-body text-ktext-secondary font-medium">
                {isRating ? 'Rated a theme' : item.mode === 'listen' ? 'Listened to a theme' : 'Watched a theme'}
              </p>
              <Link href={`/theme/${item.themeSlug}`} className="text-base font-display font-bold text-ktext-primary hover:text-accent transition-colors truncate block">
                {item.themeId?.songTitle || 'Unknown Track'}
              </Link>
            </div>
            {isRating && (
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-accent-container font-mono font-bold text-accent text-sm">
                {item.score}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono font-bold text-ktext-tertiary uppercase">
              {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="w-1 h-1 rounded-full bg-border-strong" />
            <Link href={`/anime/${item.themeId?.anilistId}`} className="text-xs font-body text-ktext-tertiary hover:underline">
              {item.themeId?.animeTitle}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserCard({ user }: { user: any }) {
  return (
    <Link href={`/user/${user.username}`} className="flex items-center gap-3 p-3 bg-bg-surface border border-border-subtle rounded-2xl interactive">
      <div className="w-12 h-12 rounded-full overflow-hidden relative border border-border-subtle flex-shrink-0">
        <Image 
          src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
          fill 
          unoptimized
          className="object-cover" 
          alt={user.displayName} 
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-display font-bold text-ktext-primary truncate">{user.displayName}</p>
        <p className="text-xs font-body text-ktext-tertiary truncate">@{user.username}</p>
      </div>
    </Link>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-bg-surface rounded-[32px] border border-dashed border-border-default">
      <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
        <Heart className="w-8 h-8 text-ktext-disabled opacity-30" />
      </div>
      <p className="text-ktext-tertiary font-body italic">{message}</p>
    </div>
  )
}
