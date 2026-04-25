import Image from 'next/image'
import Link from 'next/link'
import { Play, Plus, Heart } from 'lucide-react'
import { getFallbackImage, getAnimeTitle, getSongTitle } from '@/lib/utils'

interface ThemeLibraryRowProps {
  theme: any
  index?: number
  isFavorite?: boolean
}

export function ThemeLibraryRow({ theme, index = 0, isFavorite = false }: ThemeLibraryRowProps) {
  const songTitle = getSongTitle(theme)
  const animeTitle = getAnimeTitle(theme)
  const fallback = getFallbackImage(theme.slug || animeTitle || undefined)

  if (isFavorite) {
    return (
      <Link 
        href={`/theme/${theme.slug}`} 
        className="relative flex items-center gap-4 p-2 pr-5 bg-[#F2DEE4] dark:bg-bg-toast rounded-[36px] shadow-sm hover:shadow-md transition-all overflow-hidden group"
      >
        <div className="absolute left-0 top-0 bottom-0 w-8 border-l-[3px] border-accent rounded-l-[36px]" />
        
        <div className="w-[56px] h-[56px] flex-shrink-0 rounded-full overflow-hidden bg-bg-elevated relative z-10 ml-1">
          <Image 
            src={theme.animeCoverImage || fallback} 
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500" 
            alt={animeTitle ?? 'Cover'} 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0 z-10">
          <p className="text-[15px] font-display font-bold text-[#2D1420] dark:text-white truncate">{songTitle}</p>
          <p className="text-[13px] font-body text-accent truncate font-medium">{animeTitle}</p>
        </div>
        <Heart className="w-4 h-4 text-accent fill-accent flex-shrink-0 z-10 group-hover:scale-125 transition-transform" />
      </Link>
    )
  }

  return (
    <Link 
      href={`/theme/${theme.slug}`} 
      className="flex items-center gap-4 p-2 pr-4 bg-[#F2DEE4] dark:bg-bg-toast rounded-full shadow-sm hover:shadow-md transition-all group"
    >
      <div className="w-[56px] h-[56px] flex-shrink-0 rounded-full overflow-hidden bg-bg-elevated relative">
        <Image 
          src={theme.animeCoverImage || fallback} 
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500" 
          alt={animeTitle ?? 'Cover'} 
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-display font-bold text-[#2D1420] dark:text-white truncate">{songTitle}</p>
        <p className="text-[13px] font-body text-[#986985] dark:text-ktext-tertiary truncate">{animeTitle}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:scale-110 transition-all">
        <Play className="w-3.5 h-3.5 text-accent fill-accent ml-0.5 group-hover:text-white group-hover:fill-white transition-colors" />
      </div>
    </Link>
  )
}
