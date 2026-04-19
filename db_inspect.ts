import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const bebop = await ThemeCache.find({ animeTitle: /Cowboy Bebop/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("Cowboy Bebop Themes:", bebop);

  const eva = await ThemeCache.find({ animeTitle: /Evangelion/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("Evangelion Themes (first 5):", eva.slice(0, 5));

  const fma = await ThemeCache.find({ animeTitle: /Fullmetal Alchemist/i }).select('animeTitle songTitle type sequence slug animeTitleEnglish').lean();
  console.log("FMA Themes (first 5):", fma.slice(0, 5));

  process.exit(0);
}
check().catch(console.error);
