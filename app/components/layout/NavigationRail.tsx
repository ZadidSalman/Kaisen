'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy, Bell, User, Settings, Library, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getFallbackAvatar } from '@/lib/utils'

export function NavigationRail({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/quiz', icon: Trophy, label: 'Quiz' },
    { path: '/library', icon: Library, label: 'Library' },
    { path: user ? `/user/${user.username}/network` : '/login', icon: Users, label: 'Network' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: user ? `/user/${user.username}` : '/login', icon: User, label: 'Profile' },
  ]

  return (
    <nav className={`
      hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-20 lg:w-60
      bg-bg-surface border-r border-border-subtle z-40 py-4
      ${className}
    `}>
      <div className="flex items-center gap-3 px-4 mb-8">
        <span className="text-accent text-2xl">≋</span>
        <span className="hidden lg:block font-display font-bold text-lg text-ktext-primary">Kaikansen</span>
      </div>
      
      <div className="space-y-2">
        {navItems.map(item => {
          const isActive = pathname === item.path || (item.label === 'Network' && pathname.includes('/network'))
          return (
            <Link key={item.label} href={item.path} className={`
              flex items-center gap-3 mx-2 px-3 py-3 rounded-full
              transition-colors duration-150 interactive
              ${isActive ? 'bg-accent-container text-accent' : 'text-ktext-secondary hover:text-ktext-primary'}
            `}>
              <item.icon className="w-6 h-6 flex-shrink-0" />
              <span className="hidden lg:block text-sm font-body font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="mt-auto space-y-2">
        <Link href="/settings" className={`
          flex items-center gap-3 mx-2 px-3 py-3 rounded-full
          transition-colors duration-150 interactive
          ${pathname === '/settings' ? 'bg-accent-container text-accent' : 'text-ktext-secondary hover:text-ktext-primary'}
        `}>
          <Settings className="w-6 h-6 flex-shrink-0" />
          <span className="hidden lg:block text-sm font-body font-medium">Settings</span>
        </Link>
        
        {user && (
          <div className="px-4 py-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent-mint relative">
              <Image 
                src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
                fill
                unoptimized
                className="object-cover" 
                alt="avatar" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-body font-semibold text-ktext-primary truncate">{user.displayName}</p>
              <p className="text-xs font-body text-ktext-tertiary truncate">@{user.username}</p>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
