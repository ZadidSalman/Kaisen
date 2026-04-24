import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from '../lib/db'
import { ThemeCache } from '../lib/models'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROGRESS_FILE = path.join(__dirname, 'embed-progress.json')
const LOG_FILE      = path.join(__dirname, 'embed.log')
const BATCH_SIZE    = 20
const DELAY_MS      = 20_000

interface EmbedProgress {
  processed: number
  errors: number
  startedAt: string
  lastUpdatedAt: string
}

function log(level: string, message: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`
  console.log(line)
  if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  }
  fs.appendFileSync(LOG_FILE, line + '\n')
}

function loadProgress(): EmbedProgress {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) }
    catch { log('WARN', 'Could not parse embed-progress.json — starting fresh') }
  }
  return { processed: 0, errors: 0, startedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString() }
}

function saveProgress(p: EmbedProgress) {
  p.lastUpdatedAt = new Date().toISOString()
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function getEmbeddings(texts: string[], inputType: 'query' | 'document' = 'document'): Promise<number[][] | null> {
  const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
  if (!VOYAGE_API_KEY) {
    log('ERROR', 'VOYAGE_API_KEY not set')
    return null
  }

  const endpoint = 'https://ai.mongodb.com/v1/embeddings'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input:      texts,
        model:      'voyage-4-large',
        input_type: inputType,
      }),
    })

    if (!res.ok) {
      log('ERROR', `Voyage API → HTTP ${res.status}`)
      return null
    }

    const { data } = await res.json() as any
    return data.map((d: any) => d.embedding)
  } catch (err) {
    log('ERROR', `Voyage API error: ${err}`)
    return null
  }
}

async function main() {
  await connectDB()
  log('INFO', '─'.repeat(50))
  log('INFO', 'EMBED SCRIPT STARTING — database: kaikansen')
  log('INFO', '─'.repeat(50))

  const progress = loadProgress()
  log('INFO', `Resuming. Previously processed: ${progress.processed}`)

  const total = await ThemeCache.countDocuments({
    $or: [{ embedding: null }, { embedding: { $size: 0 } }]
  })
  log('INFO', `Themes without embeddings: ${total}`)

  if (total === 0) {
    log('SUCCESS', 'All themes already have embeddings!')
    process.exit(0)
  }

  let batchNum = 0

  while (true) {
    const batch = await ThemeCache.find({
      $or: [{ embedding: null }, { embedding: { $size: 0 } }]
    })
      .limit(BATCH_SIZE)
      .lean()

    if (batch.length === 0) {
      log('SUCCESS', 'All themes embedded!')
      break
    }

    batchNum++
    log('INFO', `Batch ${batchNum}: ${batch.length} themes`)

    const texts = batch.map((t: any) => {
      const parts = [
        t.songTitle,
        t.artistName,
        ...(t.allArtists ?? []),
        ...(t.artistRoles ?? []),
        t.animeTitle,
        t.animeTitleEnglish,
        ...(t.animeTitleAlternative ?? []),
        t.type === 'OP' ? 'anime opening' : 'anime ending',
      ].filter(Boolean) as string[]
      return parts.join(' ')
    })

    try {
      const embeddings = await getEmbeddings(texts, 'document')

      if (!embeddings || embeddings.length !== batch.length) {
        log('ERROR', `Batch ${batchNum}: Voyage API returned unexpected response — skipping batch`)
        progress.errors += batch.length
        saveProgress(progress)

        await ThemeCache.bulkWrite(
          batch.map((t: any) => ({
            updateOne: {
              filter: { _id: t._id },
              update: { $set: { embedding: [] } },
            },
          }))
        )
        continue
      }

      await ThemeCache.bulkWrite(
        batch.map((theme: any, i: number) => ({
          updateOne: {
            filter: { _id: theme._id },
            update: { $set: { embedding: embeddings[i] } },
          },
        }))
      )

      progress.processed += batch.length
      saveProgress(progress)

      log('SUCCESS', `Batch ${batchNum} done. Total: ${progress.processed} embedded, ${progress.errors} errors`)

      const remaining = await ThemeCache.countDocuments({
        $or: [{ embedding: null }, { embedding: { $size: 0 } }]
      })
      if (remaining > 0) {
        log('INFO', `${remaining} remaining. Waiting ${DELAY_MS / 1000}s...`)
        await delay(DELAY_MS)
      }

    } catch (err) {
      log('ERROR', `Batch ${batchNum} exception: ${err}`)
      progress.errors += batch.length
      saveProgress(progress)
      log('INFO', 'Waiting 30s before retry...')
      await delay(30_000)
    }
  }

  log('INFO', '─'.repeat(50))
  log('INFO', `EMBED COMPLETE`)
  log('INFO', `Total embedded: ${progress.processed}`)
  log('INFO', `Total errors:   ${progress.errors}`)
  log('INFO', '─'.repeat(50))
  process.exit(0)
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
