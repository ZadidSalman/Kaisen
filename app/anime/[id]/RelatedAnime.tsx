'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import { getAnimeTitleFromCache } from '@/lib/utils'

export function RelatedAnime({ animeId }: { animeId: number }) {
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRelated() {
      try {
        const res = await fetch(`/api/anime/${animeId}/related`)
        const json = await res.json()
        if (json.success) {
          setRelated(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch related anime:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRelated()
  }, [animeId])

  if (loading || related.length === 0) return null

  return (
    <div className="pt-12 pb-20">
      <h3 className="text-sm font-display font-bold text-ktext-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Layers className="w-4 h-4 text-accent" />
        Related Series
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {related.map(item => {
          const displayTitle = getAnimeTitleFromCache(item)
          return (
            <Link key={item.anilistId} href={`/anime/${item.anilistId}`} className="group space-y-2">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-bg-surface border border-border-subtle shadow-md interactive">
                <Image 
                  src={item.coverImageLarge || 'https://picsum.photos/seed/anime/200/300'} 
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt={displayTitle} 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                   <p className="text-[10px] font-mono font-bold text-white/80 uppercase">
                      {item.seasonYear} {item.season}
                   </p>
                </div>
              </div>
              <p className="text-xs font-body font-bold text-ktext-primary line-clamp-2 group-hover:text-accent transition-colors">
                {displayTitle}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
