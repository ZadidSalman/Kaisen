'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'motion/react'

export function SurpriseBanner() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <div className="relative w-full h-56 md:h-64 rounded-card overflow-hidden group">
      {/* Background Image with Parallax-like effect */}
      <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-110">
        <Image 
          src="https://picsum.photos/seed/anime-dreamy/1200/600" 
          fill 
          className="object-cover" 
          alt="Surprise background"
          referrerPolicy="no-referrer"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-linear-to-r from-bg-base/95 via-bg-base/60 to-transparent md:from-bg-base/95 md:via-bg-base/40" />
        <div className="absolute inset-0 bg-linear-to-t from-bg-base/40 to-transparent" />
      </div>

      {/* Floating Anime Illustration Element */}
      <div className="absolute top-0 right-0 h-full w-full pointer-events-none overflow-hidden hidden md:block">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-8 -bottom-12 w-80 h-80 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
        >
          <Image 
            src="https://picsum.photos/seed/anime-girl-headphones/600/600"
            fill
            className="object-contain rounded-full border-4 border-accent/20 p-2"
            alt="Anime illustration"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 max-w-xl">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-accent/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xs font-display font-bold text-accent uppercase tracking-widest">Feeling Lucky?</span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-display font-black text-ktext-primary mb-2 leading-tight">
            Discover Your Next <br /> 
            <span className="text-accent underline decoration-accent-subtle decoration-4 underline-offset-4">Musical Obsession</span>
          </h3>
          
          <p className="text-sm font-body text-ktext-secondary mb-6 max-w-sm line-clamp-2 md:line-clamp-none">
            Let our algorithm find a highly-rated anime opening or ending theme just for you.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSurprise}
              disabled={loading}
              className="group/btn relative flex items-center gap-3 h-12 px-8 rounded-full
                         bg-accent text-white font-display font-bold text-sm
                         transition-all duration-300 shadow-accent-glow
                         hover:shadow-accent-glow-lg hover:-translate-y-1 active:translate-y-0
                         disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Surprise Me</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
              
              {/* Glossy sweep */}
              <div className="absolute inset-0 -left-[100%] w-1/2 h-full bg-linear-to-r from-transparent via-white/20 to-transparent animate-sweep pointer-events-none" />
            </button>
            
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-ktext-tertiary">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              1.2k users found themes today
            </span>
          </div>
        </motion.div>
      </div>

      {/* Decorative side element */}
      <div className="absolute top-0 right-0 h-full w-1/3 hidden lg:flex items-center justify-center opacity-20 pointer-events-none">
        <Sparkles className="w-32 h-32 text-accent rotate-12" />
      </div>
    </div>
  )
}
