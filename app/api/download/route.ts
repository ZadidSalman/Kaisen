import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import { PassThrough, Readable } from 'stream'
import fs from 'fs'

let ffmpegInitialized = false
let ffmpegBinaryPath = ''

async function initFfmpeg() {
  if (ffmpegInitialized) return ffmpegBinaryPath
  
  try {
    // 1. Try ffmpeg-static first (most reliable on Vercel/Serverless)
    const ffmpegStatic = await import('ffmpeg-static').then(m => m.default || m)
    if (ffmpegStatic) {
      ffmpegBinaryPath = typeof ffmpegStatic === 'string' ? ffmpegStatic : ffmpegStatic.path
      if (ffmpegBinaryPath) {
        ffmpeg.setFfmpegPath(ffmpegBinaryPath)
        console.log('[FFMPEG] Initialized via ffmpeg-static:', ffmpegBinaryPath)
        ffmpegInitialized = true
        return ffmpegBinaryPath
      }
    }
  } catch (err) {
    console.warn('[FFMPEG] ffmpeg-static lookup failed')
  }

  try {
    // 2. Fallback to installer
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg').then(m => m.default || m)
    if (ffmpegInstaller && ffmpegInstaller.path) {
      ffmpegBinaryPath = ffmpegInstaller.path
      ffmpeg.setFfmpegPath(ffmpegBinaryPath)
      console.log('[FFMPEG] Initialized via installer:', ffmpegBinaryPath)
      ffmpegInitialized = true
      return ffmpegBinaryPath
    }
  } catch (err) {
    console.warn('[FFMPEG] Installer lookup failed')
  }

  // 3. Manual search for common paths
  const possiblePaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/var/task/node_modules/ffmpeg-static/ffmpeg',
    './node_modules/ffmpeg-static/ffmpeg'
  ]

  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        ffmpegBinaryPath = path
        ffmpeg.setFfmpegPath(ffmpegBinaryPath)
        console.log('[FFMPEG] Manual detection found:', path)
        ffmpegInitialized = true
        return ffmpegBinaryPath
      }
    } catch (e) {}
  }

  ffmpegInitialized = true
  return ffmpegBinaryPath
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

    const currentFfmpegPath = await initFfmpeg()

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
      if (!currentFfmpegPath) {
        return NextResponse.json({ success: false, error: 'MP3 conversion currently unavailable (server configuration issue)' }, { status: 500 })
      }

      // Vercel Serverless environment: make sure binary is executable
      try {
        fs.accessSync(currentFfmpegPath, fs.constants.X_OK)
      } catch (e) {
        try { fs.chmodSync(currentFfmpegPath, 0o755) } catch (_) {}
      }

      const passThrough = new PassThrough()
      
      // Convert Web ReadableStream to Node Readable
      const nodeStream = Readable.from(response.body as any)

      // Start Conversion
      ffmpeg(nodeStream)
        .toFormat('mp3')
        .audioBitrate(192)
        .on('start', (cmd) => console.log('[FFMPEG] Started:', cmd))
        .on('error', (err) => {
          console.error('[FFMPEG] Error during conversion:', err.message)
          if (!passThrough.destroyed) {
             passThrough.destroy(err) 
          }
        })
        .on('end', () => console.log('[FFMPEG] Conversion Finished'))
        .pipe(passThrough, { end: true })

      // Convert Node PassThrough to native Web ReadableStream for stable Vercel execution
      const webStream = new ReadableStream({
        start(controller) {
          passThrough.on('data', (chunk) => controller.enqueue(chunk))
          passThrough.on('end', () => controller.close())
          passThrough.on('error', (err) => controller.error(err))
        },
        cancel() {
          passThrough.destroy()
        }
      })

      return new NextResponse(webStream, {
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
