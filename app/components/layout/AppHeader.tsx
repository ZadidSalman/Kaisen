'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Search, X, Home, Trophy, Bell, User as UserIcon, Settings, Library, Users, ListMusic, Heart, Medal } from 'lucide-react'
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
    setIsMenuOpen(false)
  }, [pathname])

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/quiz/multiplayer', icon: Trophy, label: 'Lobby' },
    { path: '/leaderboard', icon: Medal, label: 'Leaderboard' },
    { path: user ? `/user/${user.username}/network` : '/login', icon: Users, label: 'Network' },
    { path: '/playlists', icon: ListMusic, label: 'Playlist' },
    { path: '/library?tab=favorites', icon: Heart, label: 'Favorite' },
    { path: '/library', icon: Library, label: 'Library' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <header className={`
        sticky top-0 z-40 h-16 px-4 flex items-center justify-between
        bg-bg-header/80 backdrop-blur-md transition-all duration-300 -mx-4 md:mx-0
        ${isDark ? 'shadow-lg border-b border-white/5' : 'border-b border-border-subtle'}
      `}>
        {/* Left: Menu Toggle & Avatar */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMenuOpen(true)} 
            className="flex interactive rounded-full p-2 lg:hidden hover:bg-white/10 transition-colors"
          >
            <Menu className="w-6 h-6 text-accent" />
          </button>
          
          <div className="hidden sm:block">
            {user ? (
              <Link href={`/user/${user.username}`} className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-bg-elevated block relative shadow-sm">
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
              <Link href="/login" className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <UserIcon className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>

        {/* Center: Logo */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center group">
          <span className="font-display font-black italic tracking-tighter text-2xl text-[#be185d] group-hover:scale-105 transition-transform">
            Kaikansen
          </span>
        </Link>
   
        {/* Right: Notifications & Search */}
        <div className="flex items-center gap-1">
          <Link href="/search" className="p-2 text-ktext-secondary hover:text-accent transition-colors">
            <Search className="w-5 h-5" />
          </Link>
          <Link href="/notifications" className="relative p-2 text-accent">
            <Bell className="w-6 h-6 fill-accent/10" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#be185d] rounded-full border-2 border-bg-header"></span>
          </Link>
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
              className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 left-0 w-80 bg-bg-surface/90 backdrop-blur-2xl border-r border-white/10 z-[70] flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                   <h1 className="text-2xl font-display font-black text-[#be185d] italic tracking-tighter">
                      Kaikansen
                   </h1>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 rounded-full hover:bg-white/10 text-ktext-secondary interactive transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {user && (
                <div className="p-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                  <Link 
                    href={`/user/${user.username}`} 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 group cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[#be185d] ring-offset-2 ring-offset-bg-surface relative shadow-lg group-hover:scale-105 transition-transform">
                      <Image 
                        src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
                        fill
                        unoptimized
                        className="object-cover" 
                        alt="avatar" 
                      />
                    </div>
                    <div>
                      <p className="font-display font-bold text-lg text-ktext-primary leading-tight group-hover:text-accent transition-colors">{user.displayName}</p>
                      <p className="text-sm font-body text-ktext-secondary group-hover:text-accent/80 transition-colors">@{user.username}</p>
                    </div>
                  </Link>
                </div>
              )}

              <div className="flex-1 overflow-y-auto py-6 space-y-1 px-4">
                {navItems.map(item => {
                  const isActive = pathname === item.path || (item.label === 'Network' && pathname.includes('/network'))
                  return (
                    <Link 
                      key={item.label} 
                      href={item.path} 
                      className={`
                        flex items-center gap-4 px-5 py-4 rounded-2xl
                        transition-all duration-200 interactive
                        ${isActive 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'text-ktext-secondary hover:text-ktext-primary hover:bg-accent/5'}
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'fill-white/20' : ''}`} />
                      <span className="text-base font-display font-bold tracking-tight">{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              <div className="p-6 border-t border-white/5">
                <p className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-ktext-tertiary text-center">
                  Sakura Neon Conservatory
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

