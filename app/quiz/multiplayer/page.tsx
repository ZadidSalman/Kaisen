'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Users, Swords, Search, Hash, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { authFetch } from '@/lib/auth-client'

export default function MultiplayerHub() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [poolMode, setPoolMode] = useState<'random' | 'watched' | 'common'>('random')
  const [guessType, setGuessType] = useState<'anime' | 'song' | 'artist'>('anime')
  const [roundCount, setRoundCount] = useState<5 | 10 | 15 | 20>(10)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) return
    setLoading(true)
    try {
      const res = await authFetch('/api/quiz/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.trim() })
      })
      const data = await res.json()
      if (data.roomId) router.push(`/quiz/room/${data.roomId}`)
      else { toast.error(data.error || 'Failed to join room'); setLoading(false) }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred')
      setLoading(false)
    }
  }

  const handleCreate = async (type: 'party' | 'duel') => {
    setLoading(true)
    try {
      const res = await authFetch('/api/quiz/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: type,
          poolMode,
          guessType,
          roundCount,
          maxPlayers: type === 'duel' ? 2 : 6,
          matchmaking: 'invite'
        })
      })
      const data = await res.json()
      if (data.roomId) router.push(`/quiz/room/${data.roomId}`)
      else { toast.error(data.error || 'Failed to create room'); setLoading(false) }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred')
      setLoading(false)
    }
  }

  const handlePublic = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/quiz/room/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomType: 'party', poolMode, guessType })
      })
      const data = await res.json()
      if (data.roomId) router.push(`/quiz/room/${data.roomId}`)
      else { toast.error(data.error || 'Failed to find public room'); setLoading(false) }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa] p-6 pb-24">
      <header className="flex items-center mb-8 h-10">
        <Link 
          href="/quiz"
          className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-accent interactive"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-display font-black text-[#831843] mb-2">Multiplayer</h1>
        <p className="text-ktext-tertiary">Play with friends or challenge the world.</p>
      </motion.div>

      <div className="space-y-4">
        {/* Matchmaking Settings */}
        <div className="bg-white border border-pink-100 rounded-3xl p-4 shadow-sm mb-2">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-wider mb-2 block ml-1">Pool Mode</label>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                {(['random', 'watched', 'common'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPoolMode(m)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      poolMode === m ? 'bg-white text-accent shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-wider mb-2 block ml-1">Guess Type</label>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                {(['anime', 'song', 'artist'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setGuessType(t)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      guessType === t ? 'bg-white text-accent shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-wider mb-2 block ml-1">Rounds</label>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                {([5, 10, 15, 20] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setRoundCount(count)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      roundCount === count ? 'bg-white text-accent shadow-sm' : 'text-gray-400'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Public Matchmaking */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handlePublic}
          disabled={loading}
          className="w-full text-left bg-gradient-to-r from-accent to-pink-500 rounded-3xl p-6 shadow-xl shadow-pink-200 interactive group overflow-hidden relative"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-black text-white mb-1">Public Matchmaking</h2>
              <p className="text-white/80 font-medium">Join a random Party room quickly</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.button>

        <div className="grid grid-cols-2 gap-4">
          {/* Create Party */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleCreate('party')}
            disabled={loading}
            className="text-left bg-white border border-pink-100 rounded-3xl p-5 shadow-sm interactive hover:border-pink-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
              <Users className="w-5 h-5 text-accent group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-lg font-display font-bold text-gray-900 leading-tight mb-1">Create Party</h2>
            <p className="text-xs text-gray-500 font-medium">2-6 Players</p>
          </motion.button>

          {/* Create Duel */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleCreate('duel')}
            disabled={loading}
            className="text-left bg-white border border-blue-100 rounded-3xl p-5 shadow-sm interactive hover:border-blue-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
              <Swords className="w-5 h-5 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-lg font-display font-bold text-gray-900 leading-tight mb-1">Create Duel</h2>
            <p className="text-xs text-gray-500 font-medium">1v1 Showdown</p>
          </motion.button>
        </div>

        {/* Join by Code */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-pink-100 rounded-3xl p-6 shadow-sm mt-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
              <Hash className="w-4 h-4 text-gray-500" />
            </div>
            <h2 className="text-lg font-display font-bold text-gray-900">Join by Code</h2>
          </div>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 font-mono font-bold text-center tracking-widest text-gray-900 placeholder:text-gray-400 placeholder:tracking-normal focus:ring-2 focus:ring-accent/20"
              maxLength={6}
            />
            <button
              type="submit"
              disabled={loading || roomCode.length < 6}
              className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold disabled:opacity-50 interactive"
            >
              Join Room
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
