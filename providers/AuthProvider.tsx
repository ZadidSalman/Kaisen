'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { AuthUser } from '@/types/app.types'
import { refreshAccessToken, setAccessToken, getAccessToken } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function initAuth() {
      const token = await refreshAccessToken()
      if (token) {
        try {
          const res = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await res.json()
          if (data.success) {
            setUser(data.data)
          }
        } catch (err) {
          console.error('Auth init failed:', err)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.success) {
      setAccessToken(data.accessToken)
      setUser(data.user)
    } else {
      throw new Error(data.error || 'Login failed')
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAccessToken(null)
    setUser(null)
    router.push('/login')
  }

  const refreshUser = async () => {
    try {
      let token = getAccessToken()
      if (!token) token = await refreshAccessToken()
      
      const res = await fetch('/api/users/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data)
      }
    } catch (err) {
      console.error('Refresh user failed:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
