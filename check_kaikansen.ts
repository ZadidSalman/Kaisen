import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  console.log("Connected to Database Name:", mongoose.connection.name);
  
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));
  const total = await ThemeCache.countDocuments({});
  console.log("Total themes in kaikansen DB:", total);

  process.exit(0);
}

check().catch(console.error);
