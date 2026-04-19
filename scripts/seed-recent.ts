import 'dotenv/config'
import { runSeedByAnime } from './seed-shared.ts'
import path from 'path'

async function run() {
  const years = [2025, 2026]
  for (const year of years) {
    const progressFile = path.join(process.cwd(), 'scripts', `progress-year-${year}-${year}.json`)
    try {
      await runSeedByAnime(progressFile, `Year ${year}`, `filter[anime][year]=${year}`)
    } catch (err) {
      console.error(`[ERROR] Failed seeding year ${year}:`, err)
    }
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
