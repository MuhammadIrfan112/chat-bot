const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

// Generates proper Zillow URL with searchQueryState but wider/clean filters
function buildZillowUrl(city, state, intent = 'buy') {
  const searchQueryState = {
    pagination: {},
    isMapVisible: true,
    isListVisible: true,
    filterState: {
      sort: { value: 'days' },
      ah: { value: true },
      isForSale: { value: intent === 'buy' },
      isForRent: { value: intent === 'rent' },
      isRecentlySold: { value: false }
    }
  };
  const encoded = encodeURIComponent(JSON.stringify(searchQueryState));
  const slug = state ? `${city.toLowerCase()}-${state.toLowerCase()}` : city.toLowerCase();
  return `https://www.zillow.com/${slug}/?searchQueryState=${encoded}`;
}

async function testCity(cityName, stateAbbr) {
  const url = buildZillowUrl(cityName, stateAbbr);
  console.log(`\nTesting ${cityName}, ${stateAbbr}: ${url.substring(0, 80)}...`);

  const runRes = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?maxItems=6&token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchUrls: [{ url: url }],
      proxy: { useApifyProxy: true, apifyProxyGroups: ['SHADER'] }
    })
  });

  const runData = await runRes.json();
  const runId = runData.data?.id;
  console.log('Run ID:', runId);
  if (!runId) return;

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const sRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const s = await sRes.json();
    const status = s.data?.status;
    process.stdout.write(`[${(i+1)*4}s] ${status} `);

    if (status === 'SUCCEEDED') {
      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${s.data?.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
      const items = await itemsRes.json();
      console.log(`\n🎉 Found ${items.length} properties in ${cityName}!`);
      items.slice(0, 3).forEach((p, idx) => {
        console.log(`  Property ${idx+1}: ${p.address || p.streetAddress} | Price: ${p.price || p.unformattedPrice} | Beds: ${p.bedrooms} | Baths: ${p.bathrooms}`);
      });
      break;
    }
    if (status === 'FAILED') {
      console.log('\n❌ Failed');
      break;
    }
  }
}

async function runAll() {
  await testCity('Morton Grove', 'IL');
}

runAll().catch(console.error);
