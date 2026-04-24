import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  const count = await ThemeCache.countDocuments({ isPopular: true });
  console.log('POPULAR_COUNT=' + count);
  process.exit(0);
}
check().catch(console.error);
