import { Metadata } from 'next'
import { FavoritesClient } from './FavoritesClient'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { BottomNav } from '@/app/components/layout/BottomNav'

export const metadata: Metadata = {
  title: 'My Favorites | Kaikansen',
  description: 'Your personal collection of favorite anime themes',
}

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-bg-base">
      <FavoritesClient />
    </main>
  )
}
