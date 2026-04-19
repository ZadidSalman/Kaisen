'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Search } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { getFallbackAvatar } from '@/lib/utils'

export function AppHeader() {
  const { isDark } = useTheme()
  const { user } = useAuth()

  return (
    <header className={`
      sticky top-0 z-40 h-14 px-4 flex items-center justify-between
      bg-bg-header transition-all duration-300 -mx-4 md:mx-0
      ${isDark ? 'rounded-none md:rounded-b-[24px] shadow-md' : 'border-b border-border-subtle'}
    `}>
      <button className="interactive rounded-full p-2">
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
  )
}
