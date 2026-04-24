import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const years = await ThemeCache.aggregate([
    { $match: { animeSeasonYear: { $ne: null } } },
    { $group: { _id: "$animeSeasonYear", count: { $sum: 1 } } },
    { $sort: { _id: -1 } }
  ]);
  
  console.log("Years in DB:", JSON.stringify(years, null, 2));
  process.exit(0);
}
check().catch(console.error);
