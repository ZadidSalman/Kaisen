import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  
  const matches = await ThemeCache.find({ 
    $or: [
      { songTitle: /Cruel Angel/i },
      { songTitle: /Zankoku/i },
      { animeTitle: /Evangelion/i }
    ]
  }).lean();
  
  console.log("Matches in kaikansen:", JSON.stringify(matches, null, 2));
  process.exit(0);
}

check().catch(console.error);
