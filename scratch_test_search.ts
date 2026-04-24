import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function testSearch(q: string) {
  const uri = process.env.MONGODB_URI || '';
  await mongoose.connect(uri, { dbName: 'kaikansen' });
  
  const ThemeCache = mongoose.models.ThemeCache || mongoose.model('ThemeCache', new mongoose.Schema({}, { strict: false }));

  console.log(`\nTesting search for: "${q}"`);

  // Layer 1 Simulation
  const words = q.split(/\s+/).filter(w => w.length > 0);
  const searchStr = words.length > 1 
    ? `"${q}" ` + words.map(w => `+${w}`).join(' ') 
    : q;
  
  console.log(`Current Search String: ${searchStr}`);
  const textResults = await ThemeCache.find({ $text: { $search: searchStr } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .lean();
  
  console.log(`Text Results (${textResults.length}):`, textResults.map((t: any) => t.animeTitle).join(', '));

  if (textResults.length === 0) {
    // Layer 2 Simulation
    console.log("Falling back to regex...");
    const regexResults = await ThemeCache.find({
      $or: [
        { songTitle: { $regex: q, $options: 'i' } },
        { animeTitle: { $regex: q, $options: 'i' } },
      ]
    }).limit(5).lean();
    console.log(`Regex Results (${regexResults.length}):`, regexResults.map((t: any) => t.animeTitle).join(', '));
  }

  // Proposed Fix Simulation
  const improvedSearchStr = words.length > 1 
    ? `"${q}" ` + words.join(' ') 
    : q;
  console.log(`Improved Search String: ${improvedSearchStr}`);
  const improvedTextResults = await ThemeCache.find({ $text: { $search: improvedSearchStr } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .lean();
  console.log(`Improved Text Results (${improvedTextResults.length}):`, improvedTextResults.map((t: any) => t.animeTitle).join(', '));

  process.exit(0);
}

const query = process.argv[2] || 'naruto shippuden';
testSearch(query).catch(console.error);
