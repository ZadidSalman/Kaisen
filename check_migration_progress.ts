import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({ isPopular: Boolean }, { strict: false }));
  
  const count = await ThemeCache.countDocuments({ isPopular: true });
  console.log("Current Popular Themes in kaikansen:", count);
  process.exit(0);
}

check().catch(console.error);
