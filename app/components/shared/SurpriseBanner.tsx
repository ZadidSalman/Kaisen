'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'motion/react'

interface BannerCover {
  animeCoverImage: string
  animeTitle: string
  slug: string
}

export function SurpriseBanner() {
  const [loading, setLoading] = useState(false)
  const [covers, setCovers] = useState<BannerCover[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchCovers() {
      try {
        const res = await fetch('/api/themes/banner-covers')
        const data = await res.json()
        if (data.success) {
          setCovers(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch banner covers:', err)
      }
    }
    fetchCovers()
  }, [])

  const handleSurprise = async () => {
    setLoading(true)
    const toastId = toast.loading('Finding your next favorite theme...', {
      style: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-accent)',
      }
    })
    try {
      const res = await fetch('/api/themes/random')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.dismiss(toastId)
      router.push(`/theme/${data.data.slug}?autoplay=true`)
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Could not find a theme. Try again!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full rounded-full bg-accent-container flex items-center justify-between p-4 sm:px-6">
      {/* Content */}
      <div className="flex flex-col">
        <h3 className="text-xl font-display font-bold text-ktext-primary">
          Surprise Me
        </h3>
        <p className="text-sm font-body text-ktext-secondary">
          Discover a random track
        </p>
      </div>

      {/* Button */}
      <button
        onClick={handleSurprise}
        disabled={loading}
        className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shrink-0
                   transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Shuffle className="w-5 h-5" /> 
        )}
      </button>
    </div>
  )
}
