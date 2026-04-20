'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { UserCard } from '@/app/components/shared/UserCard'
import { Users, UserPlus, ArrowLeft, Heart } from 'lucide-react'
import Link from 'next/link'

type Tab = 'followers' | 'following'

export function NetworkClient({ initialUser }: { initialUser: any }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as Tab) || 'followers'
  const [activeTab, setActiveTab] = useState<Tab>(['followers', 'following'].includes(initialTab) ? initialTab : 'followers')
  const [data, setData] = useState<{ followers: any[], following: any[] }>({
    followers: [],
    following: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNetworkData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/users/${initialUser.username}/network`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch network data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchNetworkData()
  }, [initialUser.username])

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'followers', label: 'Followers', icon: Users },
    { id: 'following', label: 'Following', icon: UserPlus },
  ]

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/user/${initialUser.username}/network?tab=${tab}`, { scroll: false })
  }

  const currentList = activeTab === 'followers' ? data.followers : data.following

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href={`/user/${initialUser.username}`} 
          className="w-10 h-10 rounded-full bg-bg-surface flex items-center justify-center border border-border-subtle interactive"
        >
          <ArrowLeft className="w-5 h-5 text-ktext-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-ktext-primary">Network</h1>
          <p className="text-sm font-body text-ktext-tertiary">@{initialUser.username}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border-subtle mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 text-sm font-display font-bold transition-all relative
              ${activeTab === tab.id ? 'text-accent' : 'text-ktext-tertiary hover:text-ktext-secondary'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label} ({data[tab.id]?.length || 0})
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabNetwork" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-border-accent border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-sm font-body text-ktext-tertiary">Loading {activeTab}...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {currentList && currentList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentList.map((user: any) => (
                  <UserCard key={user.username} user={user} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-bg-surface rounded-[32px] border border-dashed border-border-default">
                <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-ktext-disabled opacity-30" />
                </div>
                <p className="text-ktext-tertiary font-body italic">
                  {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
