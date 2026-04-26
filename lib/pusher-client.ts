import PusherJs from 'pusher-js'
import { authFetch } from './auth-client'

export const pusherClient = 
  typeof window !== 'undefined'
    ? new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authorizer: (channel) => {
          return {
            authorize: (socketId, callback) => {
              authFetch('/api/pusher/auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name
                })
              })
              .then(async res => {
                if (!res.ok) {
                  const text = await res.text()
                  throw new Error(text || `Auth failed with status ${res.status}`)
                }
                return res.json()
              })
              .then(data => {
                callback(null, data)
              })
              .catch(err => {
                console.error('Pusher auth error:', err)
                callback(err, null)
              })
            }
          }
        }
      })
    : (null as any)
