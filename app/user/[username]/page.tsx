import { ProfileClient } from './ProfileClient'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { NavigationRail } from '@/app/components/layout/NavigationRail'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  await connectDB()

  const user = await User.findOne({ username: username.toLowerCase() }).lean()
  
  if (!user) {
    notFound()
  }

  // Serialize Mongoose doc to plain object for client component
  const serializedUser = JSON.parse(JSON.stringify({
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    totalRatings: user.totalRatings,
    totalFollowers: user.totalFollowers,
    totalFollowing: user.totalFollowing,
    totalTime: user.totalTime || 0,
    createdAt: user.createdAt,
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
          <Suspense fallback={<div className="p-8 text-center text-ktext-tertiary">Loading profile...</div>}>
            <ProfileClient initialData={serializedUser} />
          </Suspense>
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
