import 'dotenv/config'
import { runSeedForFilter } from '../seed-shared.ts'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

runSeedForFilter(
  path.join(__dirname, 'progress-part4.json'),
  'Part 4 — Anime P to T',
  (anime: any) => {
    const first = (anime?.name ?? '')[0]?.toUpperCase() ?? ''
    return first >= 'P' && first <= 'T'
  }
).then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
