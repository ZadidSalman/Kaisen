'use client'
import { useState, useRef } from 'react'
import {
  ChevronLeft,
  Check,
  Pencil,
  User,
  AtSign,
  FileText,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getFallbackAvatar } from '@/lib/utils'
import { getAccessToken } from '@/lib/auth-client'

const MAX_BIO = 200

export function EditProfileClient() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')

  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const bioCharsLeft = MAX_BIO - bio.length

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    if (!displayName.trim()) {
      showToast('error', 'Display name cannot be empty.')
      return
    }

    setIsSaving(true)
    try {
      const token = getAccessToken()
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
      }
      if (avatarUrl.trim()) {
        body.avatarUrl = avatarUrl.trim()
      } else {
        body.avatarUrl = null
      }

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        await refreshUser()
        showToast('success', 'Profile updated!')
        setTimeout(() => router.push('/settings'), 800)
      } else {
        showToast('error', data.error || 'Failed to save.')
      }
    } catch {
      showToast('error', 'Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const avatarSrc =
    avatarUrl.trim() || (user ? getFallbackAvatar(user.username) : '/fallback-avatar.png')

  return (
    <div className="min-h-screen bg-bg-base pb-32">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-display font-bold
              ${toast.type === 'success'
                ? 'bg-accent/10 border-accent/20 text-accent'
                : 'bg-error/10 border-error/20 text-error'
              }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />
            }
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg-base/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border-subtle">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-surface border border-border-subtle interactive"
        >
          <ChevronLeft className="w-5 h-5 text-ktext-primary" />
        </button>
        <h1 className="text-xl font-display font-black text-accent uppercase tracking-tighter">
          Edit Profile
        </h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-accent text-white interactive disabled:opacity-50 shadow-lg shadow-accent/20"
        >
          {isSaving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Check className="w-5 h-5" />
          }
        </button>
      </div>

      <div className="px-6 max-w-2xl mx-auto mt-8 space-y-8">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-accent-mint to-accent shadow-xl">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-bg-base relative">
                <Image
                  src={avatarSrc}
                  fill
                  unoptimized
                  className="object-cover"
                  alt="Avatar preview"
                />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center border-4 border-bg-base shadow-md">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="text-xs font-body text-ktext-tertiary font-bold">
            Set an avatar URL below
          </p>
        </motion.div>

        {/* Avatar URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.2em] text-ktext-tertiary px-1">
            <Camera className="w-3.5 h-3.5" />
            Avatar URL
          </label>
          <div className="relative">
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full bg-bg-surface border border-border-subtle rounded-2xl px-5 py-4 pr-12 text-sm font-body text-ktext-primary placeholder:text-ktext-disabled focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
        </motion.div>

        {/* Display Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.2em] text-ktext-tertiary px-1">
            <User className="w-3.5 h-3.5" />
            Display Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your display name"
              className="w-full bg-bg-surface border border-border-subtle rounded-2xl px-5 py-4 text-sm font-body text-ktext-primary placeholder:text-ktext-disabled focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
        </motion.div>

        {/* Username (read-only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.2em] text-ktext-tertiary px-1">
            <AtSign className="w-3.5 h-3.5" />
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={user?.username ?? ''}
              readOnly
              className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-5 py-4 text-sm font-body text-ktext-tertiary cursor-not-allowed opacity-60"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-display font-bold text-ktext-disabled uppercase tracking-wider">
              Fixed
            </span>
          </div>
          <p className="text-[11px] font-body text-ktext-disabled px-1">
            Usernames cannot be changed.
          </p>
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.2em] text-ktext-tertiary">
              <FileText className="w-3.5 h-3.5" />
              Bio
            </label>
            <span
              className={`text-xs font-display font-bold transition-colors ${
                bioCharsLeft < 20 ? 'text-error' : 'text-ktext-disabled'
              }`}
            >
              {bioCharsLeft} left
            </span>
          </div>
          <div className="relative">
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={MAX_BIO}
              rows={4}
              placeholder="Tell the world about yourself — your anime taste, favorite OPs, guilty pleasures…"
              className="w-full bg-bg-surface border border-border-subtle rounded-2xl px-5 py-4 text-sm font-body text-ktext-primary placeholder:text-ktext-disabled focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all resize-none leading-relaxed"
            />
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-[28px] bg-accent text-white font-display font-black uppercase tracking-widest text-sm interactive shadow-lg shadow-accent/25 disabled:opacity-60 transition-all"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Pencil className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
