import 'dotenv/config'
import { runSeedByAnime } from './seed-shared.ts'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const yearFrom = parseInt(process.argv[2] ?? process.env.SEED_YEAR_FROM ?? process.env.SEED_YEAR ?? '2024')
const yearTo   = parseInt(process.argv[3] ?? process.env.SEED_YEAR_TO   ?? process.env.SEED_YEAR ?? yearFrom.toString())

if (isNaN(yearFrom) || isNaN(yearTo)) {
  console.error('Usage: SEED_YEAR=2023 npm run seed:year')
  console.error('   or: SEED_YEAR_FROM=2020 SEED_YEAR_TO=2023 npm run seed:year')
  process.exit(1)
}

console.log(`Seeding anime from year ${yearFrom} to ${yearTo}`)

runSeedByAnime(
  path.join(__dirname, `progress-year-${yearFrom}-${yearTo}.json`),
  `Year ${yearFrom}–${yearTo}`,
  yearFrom === yearTo ? `filter[year]=${yearFrom}` : undefined
).then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
