import Link from 'next/link'
import { Music, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6 shadow-sm">
        <Music className="w-10 h-10 text-accent animate-pulse" />
      </div>
      <h1 className="text-4xl font-display font-black text-ktext-primary mb-3">
        404
      </h1>
      <h2 className="text-xl font-display font-bold text-ktext-secondary mb-2">
        Track Not Found
      </h2>
      <p className="text-sm font-body text-ktext-tertiary max-w-sm mb-8">
        The melody or page you are looking for might have been moved, renamed, or does not exist.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-display text-sm font-bold shadow-md shadow-accent/25 hover:scale-105 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  )
}
