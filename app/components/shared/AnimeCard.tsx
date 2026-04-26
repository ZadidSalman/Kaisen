import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface AnimeCardProps {
  anime: {
    titleRomaji: string
    titleEnglish?: string
    coverImageLarge?: string
    anilistId?: number
    kitsuId?: string
    malId?: number
  }
}

export const AnimeCard = React.memo(function AnimeCard({ anime }: AnimeCardProps) {
  const animeId = anime.anilistId || anime.kitsuId || anime.malId || ''
  const coverImage = anime.coverImageLarge || '/placeholder.png' // Use fallback if not found

  return (
    <Link href={`/anime/${animeId}`} className="group flex flex-col gap-2 w-32 flex-shrink-0">
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-bg-surface border border-border-subtle group-hover:border-border-accent transition-colors">
        <Image 
          src={coverImage} 
          fill 
          className="object-cover transition-transform duration-300 group-hover:scale-105" 
          alt={anime.titleRomaji} 
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <p className="text-sm font-display font-bold text-ktext-primary line-clamp-1 group-hover:text-accent transition-colors">
          {anime.titleRomaji}
        </p>
        {anime.titleEnglish && (
          <p className="text-xs font-body text-ktext-tertiary line-clamp-1">
            {anime.titleEnglish}
          </p>
        )}
      </div>
    </Link>
  )
})
