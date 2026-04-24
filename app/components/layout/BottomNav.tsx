'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy, Library, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const isHiddenPage = pathname.includes('/network') || pathname.includes('/quiz/play')

  if (isHiddenPage) return null

  const navItems: { path: string; icon: any; label: string; badge?: number }[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/quiz', icon: Trophy, label: 'Quiz' },
    { path: user ? `/user/${user.username}/network` : '/login', icon: User, label: 'Social' },
    { path: '/library', icon: Library, label: 'Library' },
  ]

  return (
    <nav className={`
      flex md:hidden fixed bottom-0 left-0 right-0 z-40
      bg-bg-surface border-t border-border-subtle
      h-16 px-4 pb-[env(safe-area-inset-bottom)] items-center justify-around
      ${className}
    `}>
      {navItems.map(item => {
        const isActive = pathname === item.path || (item.label === 'Social' && pathname.includes('/network'))
        return (
          <Link key={item.label} href={item.path} className={`
            flex flex-col items-center justify-center gap-1 relative interactive
            w-16 h-14 rounded-[20px] transition-all
            ${isActive ? 'bg-accent text-white' : 'text-accent/60'}
          `}>
            <item.icon className="w-5 h-5 relative z-10" />
            <span className="text-[10px] font-body font-bold relative z-10">{item.label}</span>
            
            {(item.badge ?? 0) > 0 && (
              <span className="absolute top-1 right-2 min-w-[16px] h-4
                               bg-error text-white text-[10px] font-mono font-bold
                               rounded-full flex items-center justify-center px-1 z-20">
                {(item.badge ?? 0) > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
