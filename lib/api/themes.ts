import { authFetch } from '../auth-client'

async function parseApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String(body.error)
      : `Request failed with status ${res.status}`
    throw new Error(message)
  }

  if (body === null) {
    throw new Error('The server returned an invalid response')
  }

  return body as T
}

export async function fetchPopularThemes(type?: string, page = 1) {
  const params = new URLSearchParams({ page: page.toString() })
  if (type) params.append('type', type)
  const res = await fetch(`/api/themes/popular?${params}`)
  return parseApiResponse(res)
}

export async function fetchSeasonalThemes(season: string, year: number, type?: string, page = 1) {
  const params = new URLSearchParams({ season, year: year.toString(), page: page.toString() })
  if (type) params.append('type', type)
  const res = await fetch(`/api/themes/seasonal?${params}`)
  return parseApiResponse(res)
}

export async function fetchThemeBySlug(slug: string) {
  const res = await fetch(`/api/themes/${slug}`)
  return res.json()
}

export async function fetchLiveStats() {
  const res = await fetch('/api/stats/live')
  return res.json()
}

export async function fetchLibraryThemes(type?: 'OP' | 'ED', page = 1, limit = 20) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
  if (type) params.append('type', type)
  const res = await authFetch(`/api/themes/library?${params}`)
  return res.json()
}

export async function fetchFavoriteThemes(type?: 'OP' | 'ED', page = 1, limit = 20) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
  if (type) params.append('type', type)
  const res = await authFetch(`/api/themes/favorites?${params}`)
  return res.json()
}

export async function addFavoriteTheme(themeId: string, themeSlug: string) {
  const res = await authFetch('/api/themes/favorites', {
    method: 'POST',
    body: JSON.stringify({ themeId, themeSlug })
  })
  return res.json()
}

export async function removeFavoriteTheme(themeId: string) {
  const res = await authFetch(`/api/themes/favorites?themeId=${themeId}`, {
    method: 'DELETE'
  })
  return res.json()
}
