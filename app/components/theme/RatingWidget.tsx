'use client'
import { getScoreColor } from '@/lib/utils'

interface RatingWidgetProps {
  userRating: number
  onRate: (score: number) => void
}

export function RatingWidget({ userRating, onRate }: RatingWidgetProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-semibold text-ktext-secondary uppercase tracking-wide">Your Rating</p>
        {userRating > 0 && <p className="text-xs font-body text-accent font-bold">Score: {userRating}/10</p>}
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            onClick={() => onRate(score)}
            className={`h-11 rounded-full font-mono font-bold text-sm
              transition-all duration-200 interactive
              ${userRating === score
                ? 'text-white scale-110 shadow-accent-glow'
                : 'bg-bg-elevated text-ktext-tertiary border border-border-default hover:border-accent-subtle'
              }`}
            style={userRating === score ? { backgroundColor: getScoreColor(score) } : {}}
            aria-label={`Rate ${score} out of 10`}
          >
            {score}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {[6, 7, 8, 9, 10].map(score => (
          <button
            key={score}
            onClick={() => onRate(score)}
            className={`h-11 rounded-full font-mono font-bold text-sm
              transition-all duration-200 interactive
              ${userRating === score
                ? 'text-white scale-110 shadow-accent-glow'
                : 'bg-bg-elevated text-ktext-tertiary border border-border-default hover:border-accent-subtle'
              }`}
            style={userRating === score ? { backgroundColor: getScoreColor(score) } : {}}
            aria-label={`Rate ${score} out of 10`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}
