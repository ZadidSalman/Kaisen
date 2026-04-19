import 'dotenv/config'
import { runSeedForFilter } from '../seed-shared.ts'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

runSeedForFilter(
  path.join(__dirname, 'progress-part5.json'),
  'Part 5 — Anime U to Z + numbers/symbols',
  (anime: any) => {
    const first = (anime?.name ?? '')[0]?.toUpperCase() ?? ''
    return first >= 'U' || !/^[A-Z]/.test(first)
  }
).then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
