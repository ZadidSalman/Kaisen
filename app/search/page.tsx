import { SearchClient } from './SearchClient'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { NavigationRail } from '@/app/components/layout/NavigationRail'

export default function SearchPage() {
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
          <SearchClient />
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
