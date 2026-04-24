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
    <Suspense fallback={<div className="p-8 text-center text-ktext-tertiary">Loading network...</div>}>
      <NetworkClient initialUser={serializedUser} />
    </Suspense>
  )
}
