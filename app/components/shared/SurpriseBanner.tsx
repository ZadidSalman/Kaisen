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
    <div className="relative w-full h-40 sm:h-48 rounded-[20px] overflow-hidden group bg-bg-surface border border-border-subtle hover:border-accent/40 transition-all duration-300 shadow-sm">
      {/* Background Collage Layer - Increased visibility, smaller covers */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-40 group-hover:opacity-60 transition-opacity duration-500">
        <div className="absolute -right-10 -top-10 w-[120%] h-[140%] rotate-[12deg] flex flex-wrap gap-3">
          {[...Array(24)].map((_, i) => (
            <div 
              key={i} 
              className="w-16 h-24 sm:w-20 sm:h-28 rounded-md bg-bg-elevated relative overflow-hidden shadow-xl"
              style={{ 
                transform: `rotate(${i % 3 === 0 ? '-8deg' : i % 3 === 1 ? '4deg' : '10deg'}) translateY(${Math.sin(i) * 10}px)`,
                margin: '2px'
              }}
            >
              <Image 
                src={`https://picsum.photos/seed/anime-cover-mini-${i}/150/200`} 
                fill 
                className="object-cover" 
                alt="Anime Cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
        {/* Background Icons */}
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-8 left-1/3 w-6 h-6 text-accent/10" />
        </div>
      </div>

      {/* Stronger left fade to keep text readable against higher visibility background */}
      <div className="absolute inset-0 bg-linear-to-r from-bg-surface via-bg-surface/90 to-transparent pointer-events-none z-5" />

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10">
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3 h-3 text-accent" />
            <p className="text-[9px] font-display font-medium text-accent uppercase tracking-[0.3em]">Synapse Discovery</p>
          </div>
          
          <h3 className="text-sm sm:text-base font-display font-bold text-ktext-primary mb-4 max-w-[200px]">
            Don&apos;t know what to listen? <br />
            <span className="text-[10px] font-body font-normal text-ktext-tertiary">Let us find the perfect theme for you.</span>
          </h3>

          <button
            onClick={handleSurprise}
            disabled={loading}
            className="group/btn inline-flex items-center gap-2 px-6 h-10 rounded-xl
                       bg-accent text-white font-display font-bold text-[11px] uppercase tracking-wider
                       transition-all hover:shadow-accent-glow hover:-translate-y-0.5 active:translate-y-0
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span>Surprise Me</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
