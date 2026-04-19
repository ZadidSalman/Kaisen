import { toast } from 'sonner'

let _accessToken: string | null = null

export function getAccessToken() {
  return _accessToken
}

export function setAccessToken(token: string | null) {
  _accessToken = token
}

export async function refreshAccessToken() {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setAccessToken(data.accessToken)
      return data.accessToken
    }
    return null
  } catch {
    return null
  }
}

export async function authFetch(url: string, options: RequestInit = {}) {
  let token = getAccessToken()

  if (!token) {
    token = await refreshAccessToken()
  }

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    token = await refreshAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      res = await fetch(url, { ...options, headers })
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = data.error || `HTTP ${res.status}`
    throw new Error(error)
  }

  return res
}
