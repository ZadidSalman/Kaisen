import PusherJs from 'pusher-js'
import { authFetch } from './auth-client'

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

// Realtime is optional for local development and solo quiz. Do not instantiate
// Pusher without its public key: the SDK throws during module evaluation and
// prevents the entire application from rendering.
export const pusherClient =
  typeof window !== 'undefined' && pusherKey && pusherCluster
    ? new PusherJs(pusherKey, {
        cluster: pusherCluster,
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
    : null
