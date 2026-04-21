'use client'
import { usePathname } from 'next/navigation'
import { NavigationRail } from './NavigationRail'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

const AUTH_PATHS = ['/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.includes(pathname)

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-bg-base flex">
      <NavigationRail className="hidden md:flex" />
      <main className="
        flex-1 min-w-0
        pb-20 md:pb-0
        md:pl-20 lg:pl-60
        px-4 md:px-6 lg:px-8
      ">
        <div className="max-w-2xl mx-auto md:max-w-7xl">
          <AppHeader />
          {children}
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
