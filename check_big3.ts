import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const naruto = await ThemeCache.countDocuments({ animeTitle: /Naruto/i });
  const bleach = await ThemeCache.countDocuments({ animeTitle: /Bleach/i });
  const piece = await ThemeCache.countDocuments({ animeTitle: /One Piece/i });
  const titan = await ThemeCache.countDocuments({ animeTitle: /Attack on Titan/i });

  console.log("Counts in kaikansen:", { naruto, bleach, piece, titan });
  process.exit(0);
}

check().catch(console.error);
