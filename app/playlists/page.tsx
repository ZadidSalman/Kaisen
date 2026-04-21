import { Metadata } from 'next'
import { PlaylistsClient } from '@/app/components/playlists/PlaylistsClient'

export const metadata: Metadata = {
  title: 'My Playlists | Kaikansen',
  description: 'Curate your favorite anime themes into custom collections.',
}

export default function PlaylistsPage() {
  return <PlaylistsClient />
}
