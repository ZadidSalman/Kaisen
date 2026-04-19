import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score: number): string {
  if (score >= 9)  return '#10b981'
  if (score >= 7)  return '#22c55e'
  if (score >= 6)  return '#84cc16'
  if (score >= 5)  return '#eab308'
  if (score >= 4)  return '#f97316'
  return '#ef4444'
}

export function getScoreLabel(score: number): string {
  const labels: Record<number, string> = {
    10: 'Masterpiece', 9: 'Excellent', 8: 'Great',
    7:  'Good',        6: 'Fine',      5: 'Average',
    4:  'Below Avg',   3: 'Bad',       2: 'Terrible', 1: 'Unwatchable'
  }
  return labels[score] ?? '—'
}

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export function timeAgo(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return then.toLocaleDateString()
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?auto=format&fit=crop&q=80&w=800', // Neon City
  'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=800', // Torii Gate
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&q=80&w=800', // Mount Fuji
  'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&q=80&w=800', // Zen Garden
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800', // Kyoto Street
]

export function getFallbackImage(seed?: string) {
  if (!seed) return FALLBACK_IMAGES[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % FALLBACK_IMAGES.length
  return FALLBACK_IMAGES[index]
}

const FALLBACK_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky&backgroundColor=b6e3f4', // Chibi Adventure 1
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=c0aede',  // Chibi Adventure 2
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Kitty&backgroundColor=ffdfbf', // Chibi Adventure 3
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sunny&backgroundColor=ffd5dc', // Chibi Adventure 4
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mochi&backgroundColor=d1d4f9', // Chibi Adventure 5
]

export function getFallbackAvatar(seed?: string) {
  if (!seed) return FALLBACK_AVATARS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % FALLBACK_AVATARS.length
  return FALLBACK_AVATARS[index]
}
