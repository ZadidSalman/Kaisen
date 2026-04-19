import 'dotenv/config'
import { runSeedByAnime } from './seed-shared.ts'
import path from 'path'

async function run() {
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
  for (const year of years) {
    const progressFile = path.join(process.cwd(), 'scripts', `progress-year-${year}-${year}.json`)
    try {
      await runSeedByAnime(progressFile, `Year ${year}`, `filter[anime][year]=${year}`)
    } catch (err) {
      console.error(`[ERROR] Failed seeding year ${year}:`, err)
      // Continue to next year
    }
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
