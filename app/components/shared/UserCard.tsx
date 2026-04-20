'use client'
import Link from 'next/link'
import Image from 'next/image'
import { getFallbackAvatar } from '@/lib/utils'
import { FollowButton } from './FollowButton'

interface UserCardProps {
  user: {
    username: string
    displayName: string
    avatarUrl?: string
    bio?: string
  }
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg-surface border border-border-subtle rounded-2xl hover:shadow-card-hover transition-all group">
      <Link href={`/user/${user.username}`} className="w-12 h-12 rounded-full overflow-hidden relative border border-border-subtle flex-shrink-0 interactive">
        <Image 
          src={user.avatarUrl ?? getFallbackAvatar(user.username)} 
          fill 
          unoptimized
          className="object-cover" 
          alt={user.displayName} 
          referrerPolicy="no-referrer"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/user/${user.username}`} className="hover:text-accent transition-colors block">
          <p className="text-sm font-display font-bold text-ktext-primary truncate">{user.displayName}</p>
          <p className="text-xs font-body text-ktext-tertiary truncate">@{user.username}</p>
        </Link>
      </div>
      <div className="flex-shrink-0">
        <FollowButton username={user.username} compact />
      </div>
    </div>
  )
}
