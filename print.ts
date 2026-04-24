import { GET } from './app/api/admin/seed-popular/route';

async function test() {
  const g = GET.toString();
  console.log(g.slice(0, 500));
}
test();
