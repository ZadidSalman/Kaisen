'use client'
import { useState } from 'react'
import { 
  ChevronLeft, 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  HelpCircle, 
  LogOut, 
  Smartphone,
  ChevronRight,
  Monitor
} from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getFallbackAvatar } from '@/lib/utils'

export function SettingsClient() {
  const { user, logout } = useAuth()
  const { theme, setTheme, isDark } = useTheme()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', href: '/settings/profile' },
        { icon: Shield, label: 'Security & Privacy', href: '#' },
        { icon: Bell, label: 'Notifications', href: '#' },
      ]
    },
    {
      title: 'Appearance',
      items: [
        { 
          icon: isDark ? Moon : Sun, 
          label: 'Theme', 
          value: theme === 'system' ? 'System' : isDark ? 'Dark' : 'Light',
          onClick: () => {
            const themes = ['light', 'dark', 'system']
            const currentIndex = themes.indexOf(theme || 'system')
            const nextIndex = (currentIndex + 1) % themes.length
            setTheme(themes[nextIndex])
          }
        },
        { icon: Smartphone, label: 'App Icon', href: '#' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', href: '#' },
        { icon: Monitor, label: 'About Kaikansen', href: '#' },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-bg-base pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg-base/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border-subtle">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface border border-border-subtle interactive"
        >
          <ChevronLeft className="w-5 h-5 text-ktext-primary" />
        </button>
        <h1 className="text-xl font-display font-black text-accent uppercase tracking-tighter">Settings</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="px-6 max-w-2xl mx-auto space-y-8 mt-6">
        {/* Profile Card */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-surface rounded-[32px] p-6 border border-border-subtle flex items-center gap-4 relative overflow-hidden group shadow-lg"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <User className="w-24 h-24 text-accent" />
            </div>
            
            <div className="w-16 h-16 rounded-full ring-2 ring-accent ring-offset-2 ring-offset-bg-surface relative overflow-hidden flex-shrink-0">
              <Image 
                src={user.avatarUrl ?? getFallbackAvatar(user.username)}
                fill
                unoptimized
                className="object-cover"
                alt="avatar"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display font-black text-ktext-primary truncate">{user.displayName}</h2>
              <p className="text-sm font-body text-ktext-secondary truncate">@{user.username}</p>
            </div>
            <button 
              onClick={() => router.push(`/user/${user.username}`)}
              className="p-2 rounded-full hover:bg-accent/10 text-accent interactive transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}

        {/* Settings Groups */}
        <div className="space-y-6">
          {settingsSections.map((section, idx) => (
            <motion.div 
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (idx + 1) }}
              className="space-y-3"
            >
              <h3 className="text-xs font-display font-bold uppercase tracking-[0.2em] text-ktext-tertiary px-2">
                {section.title}
              </h3>
              <div className="bg-bg-surface rounded-[32px] border border-border-subtle overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={item.label}
                    onClick={() => item.onClick ? item.onClick() : item.href !== '#' ? router.push(item.href) : null}
                    className={`
                      w-full flex items-center justify-between p-5 transition-colors interactive
                      ${itemIdx !== section.items.length - 1 ? 'border-b border-border-subtle/50' : ''}
                      group
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-accent-container/30 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-display font-bold text-ktext-secondary group-hover:text-ktext-primary transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span className="text-xs font-body font-bold text-accent bg-accent/5 px-3 py-1 rounded-full uppercase tracking-wider">
                          {item.value}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-ktext-tertiary" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4"
        >
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-[28px] bg-error/10 hover:bg-error/20 text-error transition-all interactive border border-error/10 font-display font-black uppercase tracking-widest text-sm"
          >
            {isLoggingOut ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                Logout Account
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] font-body font-bold text-ktext-disabled mt-8 uppercase tracking-[0.3em]">
            Kaikansen v1.2.4 • Sakura Neon
          </p>
        </motion.div>
      </div>
    </div>
  )
}
