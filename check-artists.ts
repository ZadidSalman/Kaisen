import { connectDB } from './lib/db'
import { ThemeCache } from './lib/models'

async function checkArtists() {
  await connectDB()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await ThemeCache.countDocuments({ 
    $or: [
      { artistName: null },
      { artistName: "" },
      { allArtists: { $size: 0 } }
    ],
    syncedAt: { $lt: oneDayAgo }
  })
  console.log(`Themes missing artist info (not synced recently): ${count}`)
  
  const totalMissing = await ThemeCache.countDocuments({ 
    $or: [
      { artistName: null },
      { artistName: "" },
      { allArtists: { $size: 0 } }
    ]
  })
  console.log(`Total themes missing artist info: ${totalMissing}`)
  process.exit(0)
}

checkArtists()
