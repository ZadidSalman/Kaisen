'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Smile, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { setAccessToken } from '@/lib/auth-client'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [anilistLoading, setAnilistLoading] = useState(false)
  const router = useRouter()
  const { setUser, refreshUser } = useAuth()

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const token = event.data.accessToken
        if (token) {
          setAccessToken(token)
          refreshUser().then(() => {
            toast.success('Account created via AniList!')
            router.push('/')
          })
        }
        setAnilistLoading(false)
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        toast.error(`Registration failed: ${event.data.error}`)
        setAnilistLoading(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [router, refreshUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, email, password }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      
      setUser(data.user)
      toast.success('Account created! Welcome to Kaikansen.')
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAniListLogin = async () => {
    setAnilistLoading(true)
    try {
      const res = await fetch('/api/auth/anilist/url')
      const data = await res.json()
      if (data.success) {
        window.open(data.url, 'anilist_auth', 'width=600,height=700')
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start AniList registration')
      setAnilistLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-widest ml-4">
              Username
            </label>
            <div className="flex items-center gap-3 h-12 md:h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full px-5
                            border border-white/10 focus-within:border-white/30 transition-all">
              <User className="w-4 h-4 md:w-5 md:h-5 text-white/70 flex-shrink-0" />
              <input
                type="text"
                placeholder="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm md:text-base font-body
                           text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Display Name Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-widest ml-4">
              Display Name
            </label>
            <div className="flex items-center gap-3 h-12 md:h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full px-5
                            border border-white/10 focus-within:border-white/30 transition-all">
              <Smile className="w-4 h-4 md:w-5 md:h-5 text-white/70 flex-shrink-0" />
              <input
                type="text"
                placeholder="How should we call you?"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm md:text-base font-body
                           text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </div>
        
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-widest ml-4">
            Email Address
          </label>
          <div className="flex items-center gap-3 h-12 md:h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full px-5
                          border border-white/10 focus-within:border-white/30 transition-all">
            <Mail className="w-4 h-4 md:w-5 md:h-5 text-white/70 flex-shrink-0" />
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm md:text-base font-body
                         text-white placeholder:text-white/40"
            />
          </div>
        </div>
        
        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-ktext-tertiary uppercase tracking-widest ml-4">
            Password
          </label>
          <div className="flex items-center gap-3 h-12 md:h-14 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full px-5
                          border border-white/10 focus-within:border-white/30 transition-all">
            <Lock className="w-4 h-4 md:w-5 md:h-5 text-white/70 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm md:text-base font-body text-white placeholder:text-white/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="interactive rounded-full p-1 hover:bg-white/10 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4 text-white/70" /> : <Eye className="w-4 h-4 text-white/70" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || anilistLoading}
          className="w-full h-12 md:h-14 bg-[#be185d] text-white rounded-full font-display font-bold
                     flex items-center justify-center gap-2 interactive hover:bg-[#a2134e] shadow-lg shadow-pink-900/20 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base pt-1"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <div className="relative flex items-center justify-center py-2 mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative px-3 bg-transparent text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
          or
        </span>
      </div>

      <button
        type="button"
        onClick={handleAniListLogin}
        disabled={loading || anilistLoading}
        className="w-full h-12 md:h-14 bg-[#00aaff] text-white rounded-full font-display font-bold
                   flex items-center justify-center gap-2 interactive hover:bg-[#0099ee] shadow-lg shadow-blue-900/20 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed mb-8 text-sm md:text-base pt-1"
      >
        {anilistLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 fill-white" /> Register with AniList
          </>
        )}
      </button>

      <p className="text-center text-xs md:text-sm font-body text-white/60">
        Already have an account?{' '}
        <Link href="/login" className="text-[#be185d] font-bold hover:underline">Sign In</Link>
      </p>
    </div>
  )
}
