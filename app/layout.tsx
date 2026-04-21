import type { Metadata } from 'next'
import { Outfit, Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { PlayerProvider } from '@/app/context/PlayerContext'
import { Toaster } from 'sonner'
import './globals.css'
import { MiniPlayer } from '@/app/components/player/MiniPlayer'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-jetbrains',
  display: 'swap',
})

import { AppShell } from '@/app/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Kaikansen',
  description: 'Anime OP/ED rating, discovery, and social platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <PlayerProvider>
                <AppShell>
                  {children}
                </AppShell>
                <MiniPlayer />
                <Toaster position="top-center" richColors />
              </PlayerProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
