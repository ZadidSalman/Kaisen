'use client'
import { useState, useEffect } from 'react'
import { ThemeListRow } from '@/app/components/theme/ThemeListRow'
import { IThemeCache } from '@/types/app.types'
import { authFetch } from '@/lib/auth-client'
import { useAuth } from '@/hooks/useAuth'

interface ThemeFilterListProps {
  themes: IThemeCache[]
}

export function ThemeFilterList({ themes }: ThemeFilterListProps) {
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState<'OP' | 'ED'>('OP')
  const [watchedSlugs, setWatchedSlugs] = useState<Set<string>>(new Set<string>())

  useEffect(() => {
    if (!user) return
    const fetchHistory = async () => {
      try {
        const res = await authFetch('/api/history')
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          const slugs = new Set<string>(json.data.map((h: any) => h.themeSlug))
          setWatchedSlugs(slugs)
        }
      } catch (err) {
        console.error('Failed to fetch watch history in list:', err)
      }
    }
    fetchHistory()
  }, [user])

  const filteredThemes = themes
    .filter(t => t.type === typeFilter)
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-ktext-primary">
          {typeFilter === 'OP' ? 'Opening Themes' : 'Ending Themes'}
        </h2>
        <div className="flex gap-1 p-1 bg-bg-elevated rounded-full">
          {(['OP', 'ED'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-8 px-4 rounded-full text-xs font-body font-bold transition-all
                ${typeFilter === t ? 'bg-accent text-white shadow-md' : 'text-ktext-secondary hover:text-ktext-primary'}`}
            >
              {t === 'OP' ? 'Openings' : 'Endings'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredThemes.length > 0 ? (
          filteredThemes.map(theme => (
            <ThemeListRow 
              key={theme.slug} 
              {...theme} 
              isWatched={watchedSlugs.has(theme.slug)}
            />
          ))
        ) : (
          <div className="py-12 text-center bg-bg-surface rounded-[24px] border border-dashed border-border-strong">
            <p className="text-ktext-tertiary font-body italic">No {typeFilter === 'OP' ? 'openings' : 'endings'} found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
