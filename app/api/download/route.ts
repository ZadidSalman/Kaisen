import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { PassThrough, Readable } from 'stream'
import fs from 'fs'

// Initialize ffmpeg path
let ffmpegBinary = ''

try {
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpegBinary = ffmpegInstaller.path
    ffmpeg.setFfmpegPath(ffmpegBinary)
    console.log('[FFMPEG] Initialized with path:', ffmpegBinary)
  }
} catch (err) {
  console.warn('[FFMPEG] Installer path detection failed, searching manually...')
  
  const possiblePaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    './node_modules/@ffmpeg-installer/linux-x64/ffmpeg',
    '/node_modules/@ffmpeg-installer/linux-x64/ffmpeg'
  ]

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      ffmpegBinary = path
      ffmpeg.setFfmpegPath(ffmpegBinary)
      console.log('[FFMPEG] Manual detection found:', path)
      break
    }
  }
}

if (!ffmpegBinary) {
  console.warn('[FFMPEG] No binary found. MP3 conversion will be disabled.')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    const filename = searchParams.get('filename') ?? 'audio'
    const targetFormat = searchParams.get('format') // e.g., 'mp3', 'ogg', 'mka'

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    }

    const allowedDomains = ['animethemes.moe', 'v.animethemes.moe', 'audio.animethemes.moe', 'picsum.photos']
    const urlHost = new URL(url).hostname
    
    if (!allowedDomains.some(domain => urlHost.endsWith(domain))) {
      return NextResponse.json({ success: false, error: 'Domain not allowed' }, { status: 403 })
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://animethemes.moe/',
      }
    })
    
    if (!response.ok) {
      console.error('[API] Source fetch failed:', response.status)
      return NextResponse.json({ success: false, error: `Source rejected request: ${response.status}` }, { status: response.status })
    }

    if (!response.body) {
      return NextResponse.json({ success: false, error: 'Empty response from source' }, { status: 500 })
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    
    // CASE 1: MP3 Conversion (Method 2)
    if (targetFormat === 'mp3') {
      if (!ffmpegBinary) {
        return NextResponse.json({ success: false, error: 'MP3 conversion currently unavailable (server configuration issue)' }, { status: 500 })
      }

      const passThrough = new PassThrough()
      
      // Convert Web ReadableStream to Node Readable
      // Web Streams are async iterables in Node 18+
      const nodeStream = Readable.from(response.body as any)

      // Start Conversion
      ffmpeg(nodeStream)
        .toFormat('mp3')
        .audioBitrate(192)
        .on('start', (cmd) => console.log('[FFMPEG] Started:', cmd))
        .on('error', (err) => {
          console.error('[FFMPEG] Error during conversion:', err)
          if (!passThrough.destroyed) passThrough.destroy()
        })
        .pipe(passThrough, { end: true })

      return new NextResponse(passThrough as any, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}.mp3"`,
        },
      })
    }

    // CASE 2: Direct Download with proper headers (Method 1)
    const finalFilename = targetFormat ? `${filename}.${targetFormat}` : filename
    const data = response.body
    if (!data) throw new Error('No body in response')

    return new NextResponse(data, {
      headers: {
        'Content-Type': targetFormat === 'ogg' ? 'audio/ogg' : targetFormat === 'mka' ? 'audio/x-matroska' : contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
      },
    })
  } catch (err) {
    console.error('[API] GET /api/download error:', err)
    return NextResponse.json({ success: false, error: 'Download failed on server' }, { status: 500 })
  }
}
