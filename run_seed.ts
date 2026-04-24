import 'dotenv/config'; // loads .env
import { GET } from './app/api/admin/seed-popular/route';

async function runSeeder() {
  console.log('Running seeder...');
  try {
    const res = await GET();
    const data = await res.json();
    console.log('Seed result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Seeder failed:', err);
  }
  process.exit(0);
}

runSeeder();
