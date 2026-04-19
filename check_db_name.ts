import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const uri = process.env.MONGODB_URI || '';
  console.log("Full URI masked:", uri.replace(/:([^@]+)@/, ':****@'));
  
  await mongoose.connect(uri);
  console.log("Connected to Database Name:", mongoose.connection.name);
  
  const total = await ThemeCache.countDocuments({});
  console.log("Total themes in current DB:", total);

  process.exit(0);
}
// Define model inline just in case
const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));

check().catch(console.error);
