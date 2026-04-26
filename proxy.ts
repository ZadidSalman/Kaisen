import { NextRequest } from 'next/server'
import { headers, cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const headersList = await headers()
  const authHeader = headersList.get('Authorization')
  let token = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else {
    const cookieStore = await cookies()
    token = cookieStore.get('token')?.value
  }

  if (!token) return null
  
  const payload = verifyAccessToken(token)
  if (!payload) return null
  
  // Return both payload and token so callers can sync cookies if needed
  return { ...payload, _token: token }
}
