import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getFallbackAvatar } from '@/lib/utils'

interface ArtistCardProps {
  artist: {
    name: string
    imageUrl?: string
    slug: string
  }
}

export const ArtistCard = React.memo(function ArtistCard({ artist }: ArtistCardProps) {
  const imageUrl = artist.imageUrl || getFallbackAvatar(artist.name)

  return (
    <Link href={`/artist/${artist.slug}`} className="group flex flex-col items-center gap-2 w-24 flex-shrink-0">
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-bg-surface border border-border-subtle group-hover:border-border-accent transition-colors shadow-sm">
        <Image 
          src={imageUrl} 
          fill 
          className="object-cover transition-transform duration-300 group-hover:scale-105" 
          alt={artist.name} 
          unoptimized
        />
      </div>
      <p className="text-sm font-display font-bold text-ktext-primary text-center line-clamp-2 leading-tight group-hover:text-accent transition-colors w-full px-1">
        {artist.name}
      </p>
    </Link>
  )
})
