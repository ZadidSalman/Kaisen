import { Metadata } from 'next'
import { LibraryClient } from '@/app/components/library/LibraryClient'

export const metadata: Metadata = {
  title: 'My Library | Kaikansen',
  description: 'Themes from your completed anime list synced via AniList',
}

export default function LibraryPage() {
  return <LibraryClient />
}
