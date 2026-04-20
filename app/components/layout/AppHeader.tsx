'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Search, X, Home, Trophy, Bell, User as UserIcon, Settings, Library, Users } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { getFallbackAvatar } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'

export function AppHeader() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    // eslint-disable-next-line
    setIsMenuOpen(false)
  }, [pathname])

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/quiz', icon: Trophy, label: 'Quiz' },
    { path: '/library', icon: Library, label: 'Library' },
    { path: user ? `/user/${user.username}?tab=friends` : '/login', icon: Users, label: 'Network' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: user ? `/user/${user.username}` : '/login', icon: UserIcon, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <header className={`
        sticky top-0 z-40 h-14 px-4 flex items-center justify-between
        bg-bg-header transition-all duration-300 -mx-4 md:mx-0
        ${isDark ? 'rounded-none md:rounded-b-[24px] shadow-md' : 'border-b border-border-subtle'}
      `}>
        <button onClick={() => setIsMenuOpen(true)} className="interactive rounded-full p-2 md:hidden">
          <Menu className="w-5 h-5 text-ktext-secondary" />
        </button>
        {/* On desktop keep this button hidden or functioning similarly if wanted, but desktop has NavigationRail */}
        <button onClick={() => setIsMenuOpen(true)} className="hidden md:flex interactive rounded-full p-2 lg:hidden">
          <Menu className="w-5 h-5 text-ktext-secondary" />
        </button>
        
        <Link href="/" className="flex items-center gap-2">
          <span className="text-accent text-2xl">≋</span>
          <span className="font-display font-bold text-lg text-ktext-primary">Kaikansen</span>
        </Link>
   
        <div className="flex items-center gap-2">
          <Link href="/search" className="interactive rounded-full p-2">
            <Search className="w-5 h-5 text-ktext-secondary" />
          </Link>
          {user ? (
            <Link href={`/user/${user.username}`} className="w-9 h-9 rounded-full overflow-hidden border-2 border-accent-mint bg-bg-elevated relative">
              <Image 
                src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
                fill
                unoptimized
                className="object-cover" 
                alt="avatar" 
                referrerPolicy="no-referrer"
              />
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-body font-semibold text-accent px-3 py-1 rounded-full bg-accent-subtle">
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Mobile/Tablet Sidebar Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-sm"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-bg-surface border-r border-border-subtle z-50 flex flex-col lg:hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="text-accent text-2xl">≋</span>
                  <span className="font-display font-bold text-lg text-ktext-primary">Kaikansen</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-full hover:bg-bg-elevated text-ktext-secondary interactive">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user && (
                <div className="p-4 border-b border-border-subtle flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent-mint relative">
                    <Image 
                      src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
                      fill
                      unoptimized
                      className="object-cover" 
                      alt="avatar" 
                    />
                  </div>
                  <div>
                    <p className="font-display font-bold text-ktext-primary">{user.displayName}</p>
                    <p className="text-xs font-body text-ktext-tertiary">@{user.username}</p>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
                {navItems.map(item => {
                  const isActive = pathname === item.path || (item.label === 'Network' && pathname.includes('/user/') && typeof window !== 'undefined' && window.location.search.includes('friends'))
                  return (
                    <Link 
                      key={item.label} 
                      href={item.path} 
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-full
                        transition-colors duration-150 interactive
                        ${isActive ? 'bg-accent-container text-accent' : 'text-ktext-secondary hover:text-ktext-primary hover:bg-bg-elevated'}
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-body font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

