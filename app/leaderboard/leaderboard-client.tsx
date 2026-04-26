'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { Crown, Trophy, TrendingUp, Medal, Shield, Star, Swords, Skull } from 'lucide-react'
import { getFallbackAvatar } from '@/lib/utils'

interface LeaderboardEntry {
  _id: string
  userId: string
  rp: number
  tier: string
  division: number | null
  stats: {
    totalGames: number
    wins: number
    winRate: number
  }
  username?: string
  displayName?: string
  avatarUrl?: string
}

export default function LeaderboardClient({ myUserId }: { myUserId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard')
        const data = await res.json()
        if (data.success) {
          setLeaderboard(data.leaderboard)
        }
      } catch (err) {
        console.error('Failed to load leaderboard', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'kage': return <Crown className="w-4 h-4 text-yellow-500" />
      case 'anbu': return <Skull className="w-4 h-4 text-red-500" />
      case 'jonin': return <Swords className="w-4 h-4 text-purple-500" />
      case 'chunin': return <Shield className="w-4 h-4 text-blue-500" />
      case 'genin': return <Star className="w-4 h-4 text-green-500" />
      default: return <Medal className="w-4 h-4 text-gray-400" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'kage': return 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'anbu': return 'text-red-500 bg-red-50 border-red-200'
      case 'jonin': return 'text-purple-500 bg-purple-50 border-purple-200'
      case 'chunin': return 'text-blue-500 bg-blue-50 border-blue-200'
      case 'genin': return 'text-green-500 bg-green-50 border-green-200'
      default: return 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffafa] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffafa] pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-display font-black text-2xl text-accent flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Global Rankings
          </h1>
          <Link href="/quiz/multiplayer" className="text-sm font-bold text-ktext-tertiary hover:text-accent transition-colors">
            Back to Hub
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* Top 3 Podium */}
        {top3.length > 0 && (
          <div className="flex justify-center items-end gap-2 sm:gap-6 mb-16 h-64 mt-10">
            {/* 2nd Place */}
            {top3[1] && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex flex-col items-center w-1/3 max-w-[140px]">
                <div className="relative mb-2">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#C0C0C0] shadow-lg overflow-hidden bg-white z-10 relative">
                    <Image src={top3[1].avatarUrl ?? getFallbackAvatar(top3[1].username || 'Unknown')} fill className="object-cover" alt="2nd" />
                  </div>
                  <div className="absolute -bottom-3 -right-2 w-8 h-8 bg-[#C0C0C0] rounded-full flex items-center justify-center font-black text-white text-sm shadow-md z-20">2</div>
                </div>
                <p className="font-display font-bold text-sm sm:text-base truncate w-full text-center">{top3[1].username || 'Unknown'}</p>
                <p className="text-xs font-mono font-bold text-accent">{top3[1].rp} RP</p>
                <div className={`mt-2 px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${getTierColor(top3[1].tier)}`}>
                  {getTierIcon(top3[1].tier)}
                  {top3[1].tier} {top3[1].division ? ` ${'I'.repeat(4 - top3[1].division)}` : ''}
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="flex flex-col items-center w-1/3 max-w-[160px] z-10">
                <Crown className="w-10 h-10 text-[#FFD700] mb-2 animate-bounce" />
                <div className="relative mb-2">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.5)] overflow-hidden bg-white relative z-10">
                    <Image src={top3[0].avatarUrl ?? getFallbackAvatar(top3[0].username || 'Unknown')} fill className="object-cover" alt="1st" />
                  </div>
                  <div className="absolute -bottom-4 -right-2 w-10 h-10 bg-[#FFD700] rounded-full flex items-center justify-center font-black text-yellow-900 text-lg shadow-md z-20">1</div>
                </div>
                <p className="font-display font-black text-lg truncate w-full text-center text-accent">{top3[0].username || 'Unknown'}</p>
                <p className="text-sm font-mono font-black text-accent">{top3[0].rp} RP</p>
                <div className={`mt-2 px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${getTierColor(top3[0].tier)}`}>
                  {getTierIcon(top3[0].tier)}
                  {top3[0].tier} {top3[0].division ? ` ${'I'.repeat(4 - top3[0].division)}` : ''}
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0 }}
                className="flex flex-col items-center w-1/3 max-w-[140px]">
                <div className="relative mb-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#CD7F32] shadow-lg overflow-hidden bg-white relative z-10">
                    <Image src={top3[2].avatarUrl ?? getFallbackAvatar(top3[2].username || 'Unknown')} fill className="object-cover" alt="3rd" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#CD7F32] rounded-full flex items-center justify-center font-black text-white text-xs shadow-md z-20">3</div>
                </div>
                <p className="font-display font-bold text-xs sm:text-sm truncate w-full text-center">{top3[2].username || 'Unknown'}</p>
                <p className="text-[10px] font-mono font-bold text-accent">{top3[2].rp} RP</p>
                <div className={`mt-2 px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${getTierColor(top3[2].tier)}`}>
                  {getTierIcon(top3[2].tier)}
                  {top3[2].tier} {top3[2].division ? ` ${'I'.repeat(4 - top3[2].division)}` : ''}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Rest of Leaderboard */}
        <div className="bg-white rounded-3xl shadow-sm border border-pink-50 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-black text-ktext-tertiary uppercase tracking-widest">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 sm:col-span-5">Player</div>
            <div className="col-span-3 sm:col-span-3 text-center">Rank</div>
            <div className="col-span-2 sm:col-span-3 text-right">RP</div>
          </div>
          
          <div className="divide-y divide-gray-50">
            {rest.map((player, idx) => {
              const rank = idx + 4
              const isMe = player.userId === myUserId
              
              return (
                <motion.div key={player.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                  className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-gray-50 ${isMe ? 'bg-pink-50 hover:bg-pink-100' : ''}`}>
                  <div className="col-span-1 text-center font-mono font-bold text-gray-400 text-sm">
                    {rank}
                  </div>
                  
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative bg-gray-100 border border-gray-200">
                      <Image src={player.avatarUrl ?? getFallbackAvatar(player.username || 'Unknown')} fill className="object-cover" alt="avatar" />
                    </div>
                    <div className="truncate">
                      <p className="font-display font-bold text-sm text-gray-900 truncate">
                        {player.username || 'Unknown'} {isMe && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full ml-1 align-middle">YOU</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-500 font-medium">Win Rate: {Math.round((player.stats?.winRate || 0) * 100)}%</span>
                        <span className="text-[10px] text-gray-500 font-medium">• {player.stats?.totalGames || 0} games</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-3 sm:col-span-3 flex justify-center">
                    <div className={`px-2 py-1 rounded-md border text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 ${getTierColor(player.tier)}`}>
                      <span className="hidden sm:inline">{getTierIcon(player.tier)}</span>
                      {player.tier} {player.division ? ` ${'I'.repeat(4 - player.division)}` : ''}
                    </div>
                  </div>
                  
                  <div className="col-span-2 sm:col-span-3 text-right">
                    <span className="font-mono font-black text-sm text-accent">{player.rp}</span>
                    <span className="hidden sm:inline text-xs font-bold text-gray-400 ml-1">RP</span>
                  </div>
                </motion.div>
              )
            })}

            {rest.length === 0 && leaderboard.length <= 3 && (
              <div className="p-8 text-center text-gray-400 font-medium text-sm">
                No more players to show!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
