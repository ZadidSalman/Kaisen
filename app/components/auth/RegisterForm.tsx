'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Smile } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAuth()

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

  return (
    <div className="w-full max-w-sm bg-bg-surface rounded-[24px] border border-border-subtle p-6 shadow-modal">
      <h2 className="text-2xl font-display font-bold text-ktext-primary mb-1">Join the Tide</h2>
      <p className="text-sm font-body text-ktext-secondary mb-6">
        Create your account to start rating themes.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-[12px] px-4
                        border border-border-default focus-within:border-border-accent transition-all">
          <User className="w-4 h-4 text-ktext-tertiary flex-shrink-0" />
          <input
            type="text"
            placeholder="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-body
                       text-ktext-primary placeholder:text-ktext-disabled"
          />
        </div>

        <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-[12px] px-4
                        border border-border-default focus-within:border-border-accent transition-all">
          <Smile className="w-4 h-4 text-ktext-tertiary flex-shrink-0" />
          <input
            type="text"
            placeholder="Display Name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-body
                       text-ktext-primary placeholder:text-ktext-disabled"
          />
        </div>
        
        <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-[12px] px-4
                        border border-border-default focus-within:border-border-accent transition-all">
          <Mail className="w-4 h-4 text-ktext-tertiary flex-shrink-0" />
          <input
            type="email"
            placeholder="email@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-body
                       text-ktext-primary placeholder:text-ktext-disabled"
          />
        </div>
        
        <div className="flex items-center gap-3 h-12 bg-bg-elevated rounded-[12px] px-4
                        border border-border-default focus-within:border-border-accent transition-all">
          <Lock className="w-4 h-4 text-ktext-tertiary flex-shrink-0" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-body text-ktext-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="interactive rounded-full p-1"
          >
            {showPassword ? <EyeOff className="w-4 h-4 text-ktext-tertiary" /> : <Eye className="w-4 h-4 text-ktext-tertiary" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-accent text-white rounded-full font-body font-semibold
                     flex items-center justify-center gap-2 interactive hover:bg-accent-hover transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              Create Account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm font-body text-ktext-secondary mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-accent font-semibold interactive">Sign In</Link>
      </p>
    </div>
  )
}
