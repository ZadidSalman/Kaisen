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
    <Suspense fallback={<div className="p-8 text-center text-ktext-tertiary">Loading profile...</div>}>
      <ProfileClient initialData={serializedUser} />
    </Suspense>
  )
}
