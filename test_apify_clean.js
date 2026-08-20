const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

async function main() {
  const url = 'https://www.zillow.com/morton-grove-il/';
  console.log('Target URL:', url);
  console.log('Token:', APIFY_TOKEN?.substring(0, 20) + '...');

  const runRes = await fetch('https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?maxItems=10&token=' + APIFY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchUrls: [{ url: url }],
      proxy: { useApifyProxy: true, apifyProxyGroups: ['SHADER'] }
    })
  });

  const data = await runRes.json();
  console.log('HTTP Status:', runRes.status);
  console.log('Run ID:', data.data?.id || data.error);

  const runId = data.data?.id;
  if (!runId) return;

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const sRes = await fetch('https://api.apify.com/v2/actor-runs/' + runId + '?token=' + APIFY_TOKEN);
    const s = await sRes.json();
    const status = s.data?.status;
    process.stdout.write(`[${(i+1)*4}s] ${status} `);

    if (status === 'SUCCEEDED') {
      console.log('\n✅ Scraper finished!');
      const itemsRes = await fetch('https://api.apify.com/v2/datasets/' + s.data?.defaultDatasetId + '/items?token=' + APIFY_TOKEN);
      const items = await itemsRes.json();
      console.log('Total items found:', items.length);
      items.slice(0, 4).forEach((it, idx) => {
        console.log(`\nProperty ${idx+1}:`);
        console.log(`  Address: ${it.address || it.streetAddress}`);
        console.log(`  Price:   ${it.price || it.unformattedPrice}`);
        console.log(`  Beds:    ${it.bedrooms} | Baths: ${it.bathrooms}`);
        console.log(`  Image:   ${it.imgSrc || it.mainImage || 'none'}`);
        console.log(`  Link:    ${it.detailUrl || it.url}`);
      });
      break;
    }
    if (status === 'FAILED' || status === 'ABORTED') {
      console.log('\n❌ Run ended with status:', status);
      break;
    }
  }
}

main().catch(console.error);
