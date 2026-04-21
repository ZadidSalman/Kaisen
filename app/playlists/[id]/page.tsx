import { Metadata } from 'next'
import { PlaylistDetailClient } from '@/app/components/playlists/PlaylistDetailClient'

export const metadata: Metadata = {
  title: 'Playlist | Kaikansen',
}

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PlaylistDetailClient id={id} />
}
