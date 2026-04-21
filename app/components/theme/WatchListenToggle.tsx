'use client'
import { Eye, Headphones } from 'lucide-react'
import { motion } from 'motion/react'

interface WatchListenToggleProps {
  mode: 'watch' | 'listen'
  onModeChange: (mode: 'watch' | 'listen') => void
  audioDisabled?: boolean
}

export function WatchListenToggle({ mode, onModeChange, audioDisabled }: WatchListenToggleProps) {
  return (
    <div className="relative flex p-1.5 bg-bg-elevated rounded-full border border-border-subtle shadow-inner w-fit mx-auto overflow-hidden">
      {/* Moving Background Slider */}
      <motion.div
        className="absolute inset-y-1.5 bg-accent rounded-full shadow-lg z-0"
        initial={false}
        animate={{
          left: mode === 'watch' ? '6px' : 'calc(50% + 1px)',
          width: 'calc(50% - 7px)',
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      <button
        onClick={() => onModeChange('watch')}
        className={`relative z-10 flex items-center justify-center gap-2 px-8 py-2.5 rounded-full font-display text-xs font-bold uppercase tracking-wider transition-colors duration-200
          ${mode === 'watch' ? 'text-white' : 'text-ktext-tertiary hover:text-ktext-secondary'}`}
      >
        <Eye className={`w-4 h-4 ${mode === 'watch' ? 'fill-current' : ''}`} />
        Watch
      </button>

      <button
        onClick={() => !audioDisabled && onModeChange('listen')}
        disabled={audioDisabled}
        className={`relative z-10 flex items-center justify-center gap-2 px-8 py-2.5 rounded-full font-display text-xs font-bold uppercase tracking-wider transition-colors duration-200
          ${mode === 'listen' ? 'text-white' : 'text-ktext-tertiary hover:text-ktext-secondary'}
          ${audioDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        <Headphones className={`w-4 h-4 ${mode === 'listen' ? 'fill-current' : ''}`} />
        Listen
      </button>
    </div>
  )
}
