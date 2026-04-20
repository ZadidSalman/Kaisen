'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy, Library, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems: { path: string; icon: any; label: string; badge?: number }[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/quiz', icon: Trophy, label: 'Quiz' },
    { path: '/library', icon: Library, label: 'Library' },
    { path: user ? `/user/${user.username}` : '/login', icon: User, label: 'Profile' },
  ]

  return (
    <nav className={`
      flex md:hidden fixed bottom-0 left-0 right-0 z-40
      bg-bg-surface border-t border-border-subtle
      h-16 pb-[env(safe-area-inset-bottom)]
      ${className}
    `}>
      {navItems.map(item => {
        const isActive = pathname === item.path
        return (
          <Link key={item.path} href={item.path} className={`
            flex-1 flex flex-col items-center justify-center gap-1 relative interactive
            ${isActive ? 'text-accent' : 'text-ktext-tertiary'}
          `}>
            {isActive && (
              <span className="absolute inset-x-auto w-14 h-9 rounded-full bg-accent-container" />
            )}
            <item.icon className="w-6 h-6 relative z-10" />
            {(item.badge ?? 0) > 0 && (
              <span className="absolute top-2 right-1/4 min-w-[16px] h-4
                               bg-error text-white text-[10px] font-mono font-bold
                               rounded-full flex items-center justify-center px-1">
                {(item.badge ?? 0) > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
