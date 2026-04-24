import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const distinctAnimes = await ThemeCache.distinct('animeTitle');
  console.log("Total unique animes in kaikansen:", distinctAnimes.length);
  console.log("Samples:", distinctAnimes.slice(0, 20));

  process.exit(0);
}

check().catch(console.error);
