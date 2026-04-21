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
    <Suspense fallback={<div className="h-96 w-full bg-bg-elevated animate-pulse rounded-card" />}>
      <ThemePageClient initialData={serializedTheme} />
    </Suspense>
  )
}
