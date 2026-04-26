'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Settings, Music, Eye, Dices, Users, Info, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { getFallbackAvatar } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'

interface QuizMode {
  id: string
  title: string
  description: string
  icon: any
  image: string
  dark: boolean
  accent?: string
}

const QUIZ_MODES: QuizMode[] = [
  {
    id: 'anime',
    title: 'Guess Anime',
    description: 'Listen to the track and identify which anime it belongs to.',
    icon: Music,
    image: 'https://wallpapercave.com/wp/wp13223666.png',
    dark: true
  },
  {
    id: 'title',
    title: 'Guess Song',
    description: 'Identify the song name or OP/ED number of the theme.',
    icon: Eye,
    image: 'https://i.ytimg.com/vi/KSXZQavFBuM/maxresdefault.jpg',
    dark: true
  },
  {
    id: 'artist',
    title: 'Guess Artist',
    description: 'Can you recognize the voice behind the legendary tracks?',
    icon: Dices,
    image: 'https://static1.srcdn.com/wordpress/wp-content/uploads/2023/03/ezgif-2-48f362695f.jpg',
    dark: true
  },
  {
    id: 'others',
    title: 'Play with Others',
    description: 'Challenge friends or match with random players in real-time.',
    icon: Users,
    image: 'https://cdn.donmai.us/original/03/0b/030b8b2073932a1d97dc9d1820cea4e7.png',
    dark: true
  }
]

export default function QuizPage() {
  const { user } = useAuth()
  const [source, setSource] = useState<'random' | 'watched'>('random')
  const [libraryCount, setLibraryCount] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      authFetch('/api/user/library/count')
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setLibraryCount(json.count)
          }
        })
        .catch(err => console.error('Failed to fetch library count:', err))
    }
  }, [user])

  const isLibraryDisabled = libraryCount !== null && libraryCount < 10

  return (
    <div className="max-w-xl mx-auto pb-10 min-h-screen bg-[#fffafa]">
      {/* Custom Header matching screenshot */}
      <header className="flex items-center justify-between h-16 mb-6">
        <Link href={user ? `/user/${user.username}` : '/login'}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent relative shadow-lg interactive">
            <Image
              src={user?.avatarUrl ?? getFallbackAvatar(user?.username || 'user')}
              fill
              className="object-cover"
              alt="User"
            />
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <span className="font-display font-black text-2xl italic tracking-tighter text-accent">
            Kaikansen
          </span>
        </div>

        <Link href="/settings" className="p-2 text-accent hover:scale-110 transition-transform">
          <Settings className="w-6 h-6" />
        </Link>
      </header>

      {/* Title & Source Section */}
      <section className="mb-8 px-2">
        <div className="flex items-end justify-between mb-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-display font-extrabold text-accent leading-tight"
            >
              Quiz Mode
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-ktext-tertiary mt-1"
            >
              Test your knowledge.
            </motion.p>
          </div>

          {/* Source Toggle */}
          <div className="flex bg-pink-100/50 p-1 rounded-2xl border border-pink-200">
            <button
              onClick={() => setSource('random')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${source === 'random' ? 'bg-accent text-white shadow-md' : 'text-accent/60'}`}
            >
              Random
            </button>
            <button
              onClick={() => !isLibraryDisabled && setSource('watched')}
              disabled={isLibraryDisabled}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-2 relative ${
                source === 'watched' ? 'bg-accent text-white shadow-md' : 'text-accent/60'
              } ${isLibraryDisabled ? 'opacity-40 cursor-not-allowed' : 'interactive'}`}
            >
              {isLibraryDisabled && <Lock className="w-3 h-3" />}
              Watched
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isLibraryDisabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-white border-2 border-accent/10 rounded-3xl p-5 flex items-start gap-4 mt-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-125 transition-transform">
                <Lock className="w-12 h-12 text-accent" />
              </div>
              <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center shrink-0">
                <Info className="w-6 h-6 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-display font-bold text-accent leading-tight">
                  Watched Mode Locked
                </p>
                <p className="text-xs text-accent/70 leading-relaxed font-medium">
                  You need at least <span className="font-bold text-accent">10 themes</span> in your library to unlock this mode. 
                  Keep watching or sync with AniList!
                </p>
                
                {/* Progress Mini-Bar */}
                <div className="mt-3 w-full h-1.5 bg-accent/5 rounded-full overflow-hidden border border-accent/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((libraryCount / 10) * 100, 100)}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
                <p className="text-[10px] text-accent/50 font-bold mt-1 uppercase tracking-wider">
                  {libraryCount} / 10 themes collected
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Quiz Modes */}
      <div className="space-y-6">
        {QUIZ_MODES.map((mode, index) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Link
              href={mode.id === 'others' ? '/quiz/multiplayer' : `/quiz/play?type=${mode.id}&source=${source === 'watched' ? 'library' : 'random'}`}
              className={`
                relative block h-48 rounded-[40px] overflow-hidden group interactive shadow-xl
                ${mode.image ? 'bg-black' : `bg-gradient-to-br ${mode.accent}`}
              `}
            >
              {mode.image && (
                <>
                  <Image
                    src={mode.image}
                    fill
                    className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-700"
                    alt={mode.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </>
              )}

              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                {/* Icon Badge */}
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-6
                  ${mode.dark ? 'bg-[#1a0b10]/80 text-white' : 'bg-white/90 text-accent'}
                `}>
                  <mode.icon className="w-7 h-7" />
                </div>

                {/* Text Content */}
                <div className="space-y-1">
                  <h3 className={`text-2xl font-display font-black tracking-tight leading-tight ${mode.dark ? 'text-white' : 'text-[#831843]'}`}>
                    {mode.title}
                  </h3>
                  <p className={`text-sm max-w-[90%] leading-relaxed ${mode.dark ? 'text-white/80' : 'text-[#831843]/70'}`}>
                    {mode.description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
