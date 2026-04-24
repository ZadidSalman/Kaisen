import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const fmaB = await ThemeCache.find({ animeTitle: /Brotherhood/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("FMAB Themes:", fmaB.slice(0, 5));

  const hxh = await ThemeCache.find({ animeTitle: /Hunter x Hunter/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("HxH Themes:", hxh.slice(0, 5));
  
  const opm = await ThemeCache.find({ animeTitle: /One Punch Man/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("OPM Themes:", opm);

  process.exit(0);
}
check().catch(console.error);
