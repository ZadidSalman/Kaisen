import Image from 'next/image'
import { notFound } from 'next/navigation'
import { connectDB } from '@/lib/db'
import { ArtistCache, ThemeCache } from '@/lib/models'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { NavigationRail } from '@/app/components/layout/NavigationRail'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { ThemeFilterList } from '@/app/components/shared/ThemeFilterList'
import { Music, Mic2 } from 'lucide-react'

export default async function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await connectDB()

  // Fetch both in parallel — ArtistCache may not exist if only ThemeCache was seeded
  const [artistFromCache, themes] = await Promise.all([
    ArtistCache.findOne({ slug }).lean(),
    ThemeCache.find({ artistSlugs: slug }).lean(),
  ])

  // If there are no themes referencing this slug either, it truly doesn't exist
  if (!artistFromCache && themes.length === 0) notFound()

  // If ArtistCache is missing, synthesize a compatible shape from the first ThemeCache document.
  // ThemeCache stores artist names in allArtists[] and slugs in artistSlugs[] — we can match by index.
  const artist = artistFromCache ?? (() => {
    const t = themes[0]
    const slugIndex = t.artistSlugs.indexOf(slug)
    const name = slugIndex !== -1 ? t.allArtists[slugIndex] : (t.artistName ?? slug)
    return {
      slug,
      name,
      aliases:   [] as string[],
      imageUrl:  null as string | null,
      totalThemes: themes.length,
    }
  })()

  // Convert to plain objects for client components
  const serializedArtist = JSON.parse(JSON.stringify(artist))
  const serializedThemes = JSON.parse(JSON.stringify(themes))

  return (
    <div className="min-h-screen bg-bg-base flex">
      <NavigationRail className="hidden md:flex" />
      <main className="flex-1 min-w-0 pb-20 md:pb-0 md:pl-20 lg:pl-60">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <AppHeader />
          
          <div className="space-y-8 mt-4">
            {/* Header Section */}
            <div className="bg-bg-surface rounded-[32px] p-6 md:p-10 border border-border-subtle shadow-card flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
              
              <div className="w-40 h-40 md:w-48 md:h-48 relative rounded-full overflow-hidden shadow-2xl border-4 border-bg-base flex-shrink-0 bg-bg-elevated">
                <Image 
                  src={artist.imageUrl || `https://picsum.photos/seed/${artist.slug}/400/400`}
                  fill
                  className="object-cover"
                  alt={artist.name}
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 text-center md:text-left z-10">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Mic2 className="w-4 h-4 text-accent" />
                  <span className="text-xs font-mono font-bold text-accent uppercase tracking-widest">Artist</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-bold text-ktext-primary mb-4 leading-tight">
                  {artist.name}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-ktext-secondary">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-elevated rounded-full border border-border-subtle">
                    <Music className="w-4 h-4 text-accent-mint" />
                    <span className="text-sm font-body font-bold text-ktext-primary">{themes.length} Tracks</span>
                  </div>
                  {artist.aliases && artist.aliases.length > 0 && (
                     <p className="text-xs font-body text-ktext-tertiary">
                       AKA: {artist.aliases.join(', ')}
                     </p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 pb-12">
              <ThemeFilterList themes={serializedThemes} />
            </div>
          </div>
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
