'use client'
import { Eye, Headphones } from 'lucide-react'

interface WatchListenToggleProps {
  mode: 'watch' | 'listen'
  onModeChange: (mode: 'watch' | 'listen') => void
  audioDisabled?: boolean
}

export function WatchListenToggle({ mode, onModeChange, audioDisabled }: WatchListenToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-bg-elevated rounded-full w-fit">
      <button
        onClick={() => onModeChange('watch')}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-body text-sm font-semibold
          transition-all duration-200 interactive
          ${mode === 'watch'
            ? 'bg-accent text-white shadow-md'
            : 'text-ktext-secondary hover:text-ktext-primary'
          }`}
      >
        <Eye className="w-4 h-4" />
        Watch
      </button>
      <button
        onClick={() => !audioDisabled && onModeChange('listen')}
        disabled={audioDisabled}
        title={audioDisabled ? 'Audio not available for this version' : ''}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-body text-sm font-semibold
          transition-all duration-200 interactive
          ${mode === 'listen'
            ? 'bg-accent text-white shadow-md'
            : audioDisabled
              ? 'opacity-50 cursor-not-allowed text-ktext-disabled'
              : 'text-ktext-secondary hover:text-ktext-primary'
          }`}
      >
        <Headphones className="w-4 h-4" />
        Listen
      </button>
    </div>
  )
}
