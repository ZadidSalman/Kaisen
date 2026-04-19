import { Suspense } from 'react'
import { ThemePageClient } from './ThemePageClient'
import { AppHeader } from '@/app/components/layout/AppHeader'
import { BottomNav } from '@/app/components/layout/BottomNav'
import { NavigationRail } from '@/app/components/layout/NavigationRail'
import { connectDB } from '@/lib/db'
import { ThemeCache } from '@/lib/models'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  await connectDB()
  const theme = await ThemeCache.findOne({ slug }).lean()
  
  if (!theme) {
    notFound()
  }

  // Convert MongoDB document to plain object for client component
  const serializedTheme = JSON.parse(JSON.stringify(theme))

  return (
    <div className="min-h-screen bg-bg-base flex">
      <NavigationRail className="hidden md:flex" />
      <main className="
        flex-1 min-w-0
        pb-20 md:pb-0
        md:pl-20 lg:pl-60
        px-4 md:px-6 lg:px-8
      ">
        <div className="max-w-2xl mx-auto md:max-w-7xl">
          <AppHeader />
          <Suspense fallback={<div className="h-96 w-full bg-bg-elevated animate-pulse rounded-card mt-4" />}>
            <ThemePageClient initialData={serializedTheme} />
          </Suspense>
        </div>
      </main>
      <BottomNav className="flex md:hidden" />
    </div>
  )
}
