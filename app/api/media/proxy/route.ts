import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = new Set([
  'v.animethemes.moe',
  'animethemes.moe',
  'audio.animethemes.moe',
])

const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'cache-control',
  'etag',
  'last-modified',
]
const RETRYABLE_UPSTREAM_STATUSES = new Set([502, 503, 504])

function isAllowedRemoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return ALLOWED_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const logTag = 'MediaProxy'
  try {
    const search = req.nextUrl.searchParams
    const sourceUrl = search.get('url')
    if (!sourceUrl) {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 })
    }

    if (!isAllowedRemoteUrl(sourceUrl)) {
      console.warn(`[${logTag}] blocked_source_url`, { sourceUrl })
      return NextResponse.json({ success: false, error: 'Source URL is not allowed' }, { status: 403 })
    }

    const upstreamHeaders = new Headers()
    const range = req.headers.get('range')
    if (range) upstreamHeaders.set('range', range)
    upstreamHeaders.set('user-agent', 'Mozilla/5.0 (compatible; KaisenMediaProxy/1.0)')
    upstreamHeaders.set('accept', 'video/webm,video/*;q=0.9,*/*;q=0.8')
    upstreamHeaders.set('referer', 'https://animethemes.moe/')
    upstreamHeaders.set('origin', 'https://animethemes.moe')

    const fetchUpstreamWithRetry = async () => {
      const maxAttempts = 3
      let attempt = 0
      let lastResponse: Response | null = null

      while (attempt < maxAttempts) {
        attempt += 1
        const response = await fetch(sourceUrl, {
          method: 'GET',
          headers: upstreamHeaders,
          redirect: 'follow',
          cache: 'no-store',
        })
        lastResponse = response
        if (!RETRYABLE_UPSTREAM_STATUSES.has(response.status) || attempt === maxAttempts) {
          return { response, attempt }
        }
        const backoffMs = attempt === 1 ? 150 : 400
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }

      return { response: lastResponse!, attempt }
    }

    const { response: upstream, attempt } = await fetchUpstreamWithRetry()

    if (!upstream.ok && upstream.status !== 206) {
      console.warn(`[${logTag}] upstream_error`, { sourceUrl, status: upstream.status, range: range ?? null, attempt })
      return NextResponse.json(
        { success: false, error: `Upstream fetch failed: ${upstream.status}` },
        { status: upstream.status }
      )
    }

    if (!upstream.body) {
      console.warn(`[${logTag}] upstream_missing_body`, { sourceUrl, status: upstream.status })
      return NextResponse.json({ success: false, error: 'Upstream response has no body' }, { status: 502 })
    }

    const headers = new Headers()
    for (const key of FORWARDED_HEADERS) {
      const value = upstream.headers.get(key)
      if (value) headers.set(key, value)
    }
    headers.set('x-kaisen-media-proxy', '1')
    headers.set('access-control-allow-origin', '*')

    const status = upstream.status === 206 || upstream.headers.has('content-range') ? 206 : 200
    console.log(`[${logTag}] streamed`, { sourceUrl, status, range: range ?? null, attempt })

    return new NextResponse(upstream.body, { status, headers })
  } catch (error) {
    console.error(`[${logTag}] route_exception`, error)
    return NextResponse.json({ success: false, error: 'Media proxy failed' }, { status: 500 })
  }
}
