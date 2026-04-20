import { authFetch } from '../auth-client'

export async function fetchPopularThemes(type?: string, page = 1) {
  const params = new URLSearchParams({ page: page.toString() })
  if (type) params.append('type', type)
  const res = await fetch(`/api/themes/popular?${params}`)
  return res.json()
}

export async function fetchSeasonalThemes(season: string, year: number, type?: string, page = 1) {
  const params = new URLSearchParams({ season, year: year.toString(), page: page.toString() })
  if (type) params.append('type', type)
  const res = await fetch(`/api/themes/seasonal?${params}`)
  return res.json()
}

export async function fetchThemeBySlug(slug: string) {
  const res = await fetch(`/api/themes/${slug}`)
  return res.json()
}

export async function fetchLiveStats() {
  const res = await fetch('/api/stats/live')
  return res.json()
}

export async function fetchLibraryThemes() {
  const res = await authFetch('/api/themes/library')
  return res.json()
}
