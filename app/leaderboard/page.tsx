import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LeaderboardClient from './leaderboard-client'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const session = await getSession()
  if (!session || !session.user) {
    redirect('/auth')
  }

  return <LeaderboardClient myUserId={session.user.id} />
}
