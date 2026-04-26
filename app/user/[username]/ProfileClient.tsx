'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Pencil, Settings, ChevronLeft, Star, Clock, Users, UserPlus, MessageSquare, Heart, Trophy, Flame, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { formatCount, getScoreColor, getScoreLabel, getFallbackAvatar, getSongTitle, getAnimeTitle } from '@/lib/utils'
import { FollowButton } from '@/app/components/shared/FollowButton'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

type Tab = 'rated' | 'watched'

export function ProfileClient({ initialData }: { initialData: any }) {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOwn = currentUser?.username === initialData.username
  
  const [activeTab, setActiveTab] = useState<Tab>('rated')
  const [data, setData] = useState<any>({
    activity: [],
    history: [],
    ratings: [],
    rank: null
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalFollowers: initialData.totalFollowers || 0,
    totalFollowing: initialData.totalFollowing || 0,
    totalWatched: initialData.totalWatched || 0,
    totalRated: initialData.totalRated || 0
  })

  useEffect(() => {
    async function fetchTabData() {
      setLoading(true)
      try {
        const [activityRes, historyRes, ratingsRes, rankRes] = await Promise.all([
          fetch(`/api/users/${initialData.username}/activity`),
          fetch(`/api/users/${initialData.username}/history`),
          fetch(`/api/users/${initialData.username}/ratings`),
          fetch(`/api/rank/${initialData.id}`)
        ])
        
        const [activity, history, ratings, rankData] = await Promise.all([
          activityRes.json(),
          historyRes.json(),
          ratingsRes.json(),
          rankRes.json()
        ])

        setData({
          activity: activity.success ? activity.data : [],
          history: history.success ? history.data : [],
          ratings: ratings.success ? ratings.data : [],
          rank: rankData.success ? rankData.rank : null
        })

        // Simple heuristic for stats if not provided
        setStats(prev => ({
          ...prev,
          totalWatched: history.success ? history.data.length : 0,
          totalRated: ratings.success ? ratings.data.length : 0
        }))

      } catch (err) {
        console.error('Failed to fetch profile data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTabData()
  }, [initialData.username])

  const profileFallback = getFallbackAvatar(initialData.username)

  return (
    <div className="min-h-screen bg-bg-base pb-32">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-bg-base/80 backdrop-blur-md z-50">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface border border-border-subtle interactive">
          <ChevronLeft className="w-5 h-5 text-ktext-primary" />
        </button>
        <h1 className="text-xl font-display font-black text-accent uppercase tracking-tighter">Profile</h1>
        <Link href="/settings" className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface border border-border-subtle interactive">
          <Settings className="w-5 h-5 text-ktext-primary" />
        </Link>
      </div>

      <div className="px-6 flex flex-col items-center">
        {/* Avatar Section */}
        <div className="relative mt-4">
          <div className="w-36 h-36 rounded-full p-1 bg-gradient-to-tr from-accent-mint to-accent shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-bg-base relative">
              <Image 
                src={initialData.avatarUrl ?? profileFallback} 
                fill
                unoptimized
                className="object-cover" 
                alt={initialData.displayName} 
              />
            </div>
          </div>
          {isOwn && (
            <Link href="/settings/profile" className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-accent flex items-center justify-center border-4 border-bg-base shadow-md interactive text-white">
              <Pencil className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* User Identity */}
        <div className="text-center mt-6">
          <h2 className="text-3xl font-display font-black text-ktext-primary tracking-tight">
            {initialData.displayName}
          </h2>
          <p className="text-sm font-body text-ktext-secondary mt-2 max-w-[280px] leading-snug mx-auto font-medium">
            {initialData.bio || 'Anime enthusiast, OP collector, and casual pianist. Currently binging vintage mecha.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mt-8">
          {[
            { label: 'Watched', value: stats.totalWatched },
            { label: 'Rated', value: stats.totalRated },
            { label: 'Followers', value: formatCount(stats.totalFollowers) },
          ].map(stat => (
            <div key={stat.label} className="bg-accent-container/20 rounded-[28px] p-4 text-center border border-accent-container/10">
              <p className="text-xl font-display font-black text-accent">{stat.value}</p>
              <p className="text-[10px] font-body font-bold text-ktext-tertiary uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Achievement Banner */}
        {data.rank && (
          <div className="w-full mt-6 bg-gradient-to-r from-accent-container/40 to-transparent rounded-[32px] p-5 flex items-center gap-4 border border-accent/10 relative overflow-hidden group interactive">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-16 h-16 text-accent" />
             </div>
             <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/20">
                <Trophy className="w-7 h-7 text-white fill-current" />
             </div>
             <div className="min-w-0">
                <h3 className="text-lg font-display font-black text-ktext-primary uppercase tracking-tight">
                  {data.rank.tier} {data.rank.division ? ` ${'I'.repeat(4 - data.rank.division)}` : ''}
                </h3>
                <p className="text-xs font-body text-ktext-tertiary font-bold mt-0.5">
                   {data.rank.rp} RP • <span className="text-accent">{Math.round((data.rank.stats?.winRate || 0) * 100)}% Win Rate</span>
                </p>
             </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="w-full mt-10 border-b border-border-subtle flex">
          {[
            { id: 'rated', label: 'Rated' },
            { id: 'watched', label: 'Watched' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 py-4 text-sm font-display font-bold transition-colors relative
                ${activeTab === tab.id ? 'text-accent' : 'text-ktext-tertiary'}
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="w-full mt-6 space-y-3">
           <AnimatePresence mode="wait">
              {loading ? (
                 <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                 </div>
              ) : (
                 <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                 >
                    {activeTab === 'rated' ? (
                       data.ratings.length > 0 ? (
                          data.ratings.map((item: any) => (
                             <RatedItemCard key={item._id} item={item} />
                          ))
                       ) : <EmptyState message="No ratings yet" />
                    ) : (
                       data.history.length > 0 ? (
                          data.history.map((item: any) => (
                             <ThemeListRow key={item._id} {...item.themeId} />
                          ))
                       ) : <EmptyState message="Nothing watched yet" />
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Activity Section */}
        <div className="w-full mt-12 pb-10">
           <h2 className="text-xl font-display font-black text-ktext-primary mb-6">Activity</h2>
           <div className="space-y-4">
              {data.activity.length > 0 ? (
                 data.activity.map((item: any, idx: number) => (
                    <SocialActivityCard key={idx} item={item} profileUser={initialData} />
                 ))
              ) : (
                 <div className="bg-bg-surface rounded-[32px] p-8 text-center border border-border-subtle">
                    <p className="text-sm font-body text-ktext-tertiary italic">
                      {isOwn 
                        ? "You have no recent social activity." 
                        : "No recent social activity. (Or activity is restricted)"}
                    </p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  )
}

function RatedItemCard({ item }: { item: any }) {
  const songTitle = getSongTitle(item.themeId)
  const animeTitle = getAnimeTitle(item.themeId)
  const label = getScoreLabel(item.score)

  return (
    <div className="bg-accent-container/10 rounded-[28px] p-4 flex items-center gap-4 interactive border border-white/5">
       <div className="w-14 h-14 rounded-2xl overflow-hidden relative flex-shrink-0 bg-bg-elevated">
          <Image 
            src={item.themeId?.animeImage || 'https://picsum.photos/seed/anime/200'} 
            fill 
            className="object-cover" 
            alt="" 
          />
       </div>
       <div className="flex-1 min-w-0">
          <h4 className="text-base font-display font-black text-ktext-primary truncate uppercase">{songTitle}</h4>
          <p className="text-xs font-body text-ktext-tertiary font-bold truncate">
             {animeTitle} {item.themeId?.type || 'OP'}
          </p>
       </div>
       <div className="text-right flex-shrink-0">
          <p className="text-2xl font-display font-black text-accent leading-none">{item.score}</p>
          <p className="text-[10px] font-body font-bold text-ktext-tertiary uppercase mt-1">{label}</p>
       </div>
    </div>
  )
}

function SocialActivityCard({ item, profileUser }: { item: any; profileUser: any }) {
  if (!item) return null
  
  // Since this is the profile user's activity feed, the actor is the profile user.
  const actorName = profileUser?.displayName || 'User'
  const actorAvatar = profileUser?.avatarUrl
  
  // Get theme details based on populated themeId
  const theme = item.themeId
  const targetName = theme ? `${theme.animeTitle || ''} ${theme.type || 'OP'}` : 'a theme'

  const getActionText = () => {
    switch (item.activityType) {
      case 'rating': return `rated ${targetName} ${item.score}/10`
      case 'watch': return `${item.mode === 'listen' ? 'listened to' : 'watched'} ${targetName}`
      default: return 'interacted with a theme'
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-bg-surface rounded-2xl border border-border-subtle group hover:border-accent/30 transition-all">
      <div className="w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">
        {actorAvatar ? (
          <img src={actorAvatar} alt="" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <span className="text-accent font-black">{actorName[0] || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body text-ktext-primary truncate">
          <span className="font-black">{actorName}</span> {getActionText()}
        </p>
        <p className="text-[10px] text-ktext-tertiary font-bold mt-0.5">
          {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Heart className="w-10 h-10 text-ktext-disabled opacity-20 mb-3" />
      <p className="text-sm font-body text-ktext-tertiary italic">{message}</p>
    </div>
  )
}

function Loader2({ className }: { className?: string }) {
  return <Activity className={`animate-spin ${className}`} />
}
