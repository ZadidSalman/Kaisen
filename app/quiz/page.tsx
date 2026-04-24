'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Settings, Music, Eye, Dices, Users, User as UserIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { getFallbackAvatar } from '@/lib/utils'

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
    image: 'https://images.wallpapersden.com/image/download/white-hair-anime-girl-school-uniform_bGhpZmyUmZqaraWkpJRmbmdlrWZlbWU.jpg',
    dark: true
  },
  {
    id: 'title',
    title: 'Guess Song',
    description: 'Identify the song name or OP/ED number of the theme.',
    icon: Eye,
    image: 'https://w0.peakpx.com/wallpaper/521/1004/HD-wallpaper-anime-original-boy-backpack-night-street.jpg',
    dark: true
  },
  {
    id: 'artist',
    title: 'Guess Artist',
    description: 'Can you recognize the voice behind the legendary tracks?',
    icon: Dices,
    image: 'https://w0.peakpx.com/wallpaper/107/947/HD-wallpaper-anime-original-girl-singer-stage-microphone.jpg',
    dark: true
  },
  {
    id: 'others',
    title: 'Play with Others',
    description: 'Challenge friends or join a public lobby. (Coming Soon)',
    icon: Users,
    image: 'https://e0.pxfuel.com/wallpapers/118/35/desktop-wallpaper-cute-anime-mascot-characters-round-chick.jpg',
    dark: true
  }
]

export default function QuizPage() {
  const { user } = useAuth()
  const [source, setSource] = useState<'random' | 'watched'>('random')

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
            Sakura Neon
          </span>
        </div>

        <Link href="/settings" className="p-2 text-accent hover:scale-110 transition-transform">
          <Settings className="w-6 h-6" />
        </Link>
      </header>

      {/* Title & Source Section */}
      <section className="mb-8 px-2 flex items-end justify-between">
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
            onClick={() => setSource('watched')}
            className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${source === 'watched' ? 'bg-accent text-white shadow-md' : 'text-accent/60'}`}
          >
            Watched
          </button>
        </div>
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
              href={mode.id === 'others' ? '#' : `/quiz/play?type=${mode.id}&source=${source === 'watched' ? 'library' : 'random'}`}
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
                    className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" 
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
