'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MoreVertical, Play } from 'lucide-react'
import { IThemeCache } from '@/types/app.types'
import { getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'
import { motion } from 'motion/react'

interface ArtistPageClientProps {
  artist: {
    slug: string
    name: string
    aliases: string[]
    imageUrl: string | null
    totalThemes: number
  }
  themes: IThemeCache[]
}

export function ArtistPageClient({ artist, themes }: ArtistPageClientProps) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(false)
  
  // Mock monthly listeners for design match
  const monthlyListeners = "12.4M"

  const bannerImage = artist.imageUrl || `https://picsum.photos/seed/${artist.slug}/1200/600`

  return (
    <div className="min-h-screen bg-bg-base pb-24 overflow-x-hidden">
      {/* Artist Header Banner */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden rounded-b-[48px] shadow-2xl">
        <Image 
          src={bannerImage}
          fill
          className="object-cover scale-105"
          alt={artist.name}
          priority
        />
        {/* Deep Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        
        {/* Content Overlay */}
        <div className="absolute bottom-12 left-0 right-0 px-8 space-y-6">
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-display font-black text-white leading-none tracking-tighter uppercase drop-shadow-2xl"
            >
              {artist.name}
            </motion.h1>
            
            <div className="flex flex-wrap items-center gap-4 text-white/90 font-body font-bold text-sm md:text-base">
              <div className="flex items-center gap-2">
                <span className="text-white">{monthlyListeners}</span>
                <span className="opacity-70 font-medium">Monthly Listeners</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/40" />
              <div className="flex items-center gap-2">
                <span className="text-white">{artist.totalThemes}</span>
                <span className="opacity-70 font-medium">Anime Themes</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsFollowing(!isFollowing)}
              className={`
                h-12 px-8 rounded-[18px] font-display font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300
                ${isFollowing 
                  ? 'bg-white/10 backdrop-blur-xl text-white border border-white/20' 
                  : 'bg-[#b02e63] text-white shadow-xl shadow-[#b02e63]/40 hover:scale-105 active:scale-95'}
              `}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            
            <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20 transition-all interactive group overflow-hidden relative">
              <Play className="w-5 h-5 fill-current relative z-10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 mt-12 space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-black text-ktext-primary tracking-tight">
            Popular Anime Themes
          </h2>
        </div>

        <div className="space-y-4">
          {themes.slice(0, 8).map((theme, i) => (
            <ArtistThemeRow key={theme.slug} theme={theme} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ArtistThemeRow({ theme, index }: { theme: IThemeCache; index: number }) {
  const songTitle = getSongTitle(theme)
  const animeTitle = getAnimeTitle(theme)
  const fallback = getFallbackImage(theme.slug)

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        href={`/theme/${theme.slug}`}
        className="flex items-center gap-4 p-2 pr-4 bg-[#fff0f3]/50 dark:bg-white/5 backdrop-blur-sm rounded-[24px] interactive group shadow-sm hover:shadow-md transition-all border border-transparent hover:border-accent/10"
      >
        <div className="w-14 h-14 relative rounded-xl overflow-hidden shadow-sm flex-shrink-0">
          <Image 
            src={theme.animeCoverImage || fallback}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            alt={animeTitle}
          />
        </div>
        
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-lg font-display font-bold text-ktext-primary truncate mb-0.5">
            {songTitle}
          </h3>
          <p className="text-xs font-body font-medium text-ktext-tertiary truncate">
            {animeTitle}
          </p>
        </div>

        <button className="w-8 h-8 flex items-center justify-center rounded-full text-ktext-tertiary hover:bg-bg-elevated hover:text-accent transition-all">
          <MoreVertical className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </Link>
    </motion.div>
  )
}


