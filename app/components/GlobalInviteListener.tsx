'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { pusherClient } from '@/lib/pusher-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-client'

export function GlobalInviteListener() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user?.id) return

    const channelName = `private-user-${user.id}`
    const channel = pusherClient.subscribe(channelName)

    channel.bind('quiz-invite', (data: any) => {
      // data: { inviteId, roomCode, roomType, fromUsername, fromAvatar }
      
      toast.custom((t) => (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-pink-100 flex flex-col gap-3 w-full max-w-sm">
          <div className="flex items-center gap-3">
            {data.fromAvatar ? (
              <img src={data.fromAvatar} alt={data.fromUsername} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold">
                {data.fromUsername[0]}
              </div>
            )}
            <div>
              <p className="font-display font-bold text-gray-900">{data.fromUsername}</p>
              <p className="text-sm text-gray-500">Invited you to a {data.roomType} quiz!</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-1">
            <button
              onClick={async () => {
                toast.dismiss(t)
                try {
                  // Respond to invite
                  await authFetch('/api/quiz/invite/respond', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inviteId: data.inviteId, action: 'accepted' })
                  })
                  
                  // Join room
                  const res = await authFetch('/api/quiz/room/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomCode: data.roomCode })
                  })
                  
                  const json = await res.json()
                  if (json.success && json.roomId) {
                    router.push(`/quiz/room/${json.roomId}`)
                  } else {
                    toast.error(json.error || 'Failed to join room')
                  }
                } catch (err) {
                  toast.error('An error occurred')
                }
              }}
              className="flex-1 bg-accent text-white py-2 rounded-lg font-bold text-sm hover:bg-accent/90 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t)
                await authFetch('/api/quiz/invite/respond', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inviteId: data.inviteId, action: 'declined' })
                })
              }}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      ), { duration: 15000 })
    })

    return () => {
      channel.unbind('quiz-invite')
      pusherClient.unsubscribe(channelName)
    }
  }, [user, router])

  return null
}
