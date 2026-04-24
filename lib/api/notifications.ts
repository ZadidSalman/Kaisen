import { authFetch } from '../auth-client'

export async function fetchNotifications() {
  const res = await authFetch('/api/notifications')
  if (!res.ok) throw new Error('Failed to fetch notifications')
  const data = await res.json()
  return data.data
}

export async function markNotificationsRead(notificationIds?: string[]) {
  const res = await authFetch('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ notificationIds })
  })
  if (!res.ok) throw new Error('Failed to mark notifications as read')
  return res.json()
}
