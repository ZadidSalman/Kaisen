'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
      return
    }

    // Check if user dismissed previously
    if (localStorage.getItem('pwa-prompt-dismissed') === 'true') {
      setIsDismissed(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsInstallable(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (!isInstallable || isStandalone || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 border border-white/5">
          <img src="/icons/icon-192x192.png" alt="App Icon" className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex-1">
          <h3 className="font-outfit font-bold text-white text-sm">Install App</h3>
          <p className="text-neutral-400 text-xs">Add to your home screen for the best experience.</p>
        </div>
        <button 
          onClick={handleInstall}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-neutral-200 transition-colors"
        >
          Install
        </button>
        <button 
          onClick={handleDismiss}
          className="text-neutral-500 hover:text-white p-2 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
