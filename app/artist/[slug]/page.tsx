import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { ArtistCache, ThemeCache } from '@/lib/models'
import { ArtistPageClient } from './ArtistPageClient'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await connectDB()

  const [artistFromCache, themes] = await Promise.all([
    ArtistCache.findOne({ slug }).lean(),
    ThemeCache.find({ artistSlugs: slug }).lean(),
  ])

  if (!artistFromCache && themes.length === 0) notFound()

  const artist = artistFromCache ?? (() => {
    const t = themes[0]
    const slugIndex = t.artistSlugs.indexOf(slug)
    const name = slugIndex !== -1 ? t.allArtists[slugIndex] : (t.artistName ?? slug)
    return {
      slug,
      name,
      aliases: [] as string[],
      imageUrl: null as string | null,
      totalThemes: themes.length,
    }
  })()

  // Convert to plain objects for client components
  const serializedArtist = JSON.parse(JSON.stringify(artist))
  const serializedThemes = JSON.parse(JSON.stringify(themes))

  return <ArtistPageClient artist={serializedArtist} themes={serializedThemes} />
}

