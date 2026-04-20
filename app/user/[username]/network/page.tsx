import { AppHeader } from '@/app/components/layout/AppHeader'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { NavigationRail } from '@/app/components/layout/NavigationRail'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'
import { NetworkClient } from './NetworkClient'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function NetworkPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  await connectDB()

  const user = await User.findOne({ username: username.toLowerCase() }).lean()
  
  if (!user) {
    notFound()
  }

  const serializedUser = JSON.parse(JSON.stringify({
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }))

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
          <Suspense fallback={<div className="p-8 text-center text-ktext-tertiary">Loading network...</div>}>
            <NetworkClient initialUser={serializedUser} />
          </Suspense>
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
