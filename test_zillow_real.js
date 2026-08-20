const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

// Geocode with Nominatim to get city center
async function getCityBounds(city, state) {
  const q = state ? `${city}, ${state}` : city;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'RealtyPropFlow-AI/2.0' } });
  const data = await res.json();
  if (data?.[0]?.lat && data?.[0]?.lon) {
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    const DEG = 0.10; // ~12km radius to cover full city area
    return {
      west: lon - DEG,
      east: lon + DEG,
      south: lat - DEG,
      north: lat + DEG
    };
  }
  return { west: -87.85, east: -87.70, south: 41.98, north: 42.10 };
}

async function safeFetch(url, opts = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function testCitySearch(city, state) {
  const bounds = await getCityBounds(city, state);
  const citySlug = city.trim().toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state ? state.trim().toLowerCase() : 'il';
  
  const searchQueryState = {
    pagination: {},
    mapBounds: bounds,
    isMapVisible: true,
    isListVisible: true,
    filterState: {
      sort: { value: 'days' },
      ah: { value: true },
      isForSale: { value: true },
      isForRent: { value: false },
      isRecentlySold: { value: false }
    }
  };
  
  const encoded = encodeURIComponent(JSON.stringify(searchQueryState));
  const fullUrl = `https://www.zillow.com/${citySlug}-${stateSlug}/?searchQueryState=${encoded}`;
  console.log(`\nTesting search for ${city}, ${state}:`);
  console.log(`URL: ${fullUrl.substring(0, 100)}...`);

  const runRes = await safeFetch(`https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?maxItems=10&token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchUrls: [{ url: fullUrl }],
      proxy: { useApifyProxy: true, apifyProxyGroups: ['SHADER'] }
    })
  });

  const runData = await runRes.json();
  const runId = runData.data?.id;
  console.log('Apify Run ID:', runId, 'Status:', runData.data?.status);
  if (!runId) return;

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const sRes = await safeFetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const s = await sRes.json();
    const status = s.data?.status;
    process.stdout.write(`[${(i+1)*4}s] ${status} `);

    if (status === 'SUCCEEDED') {
      const itemsRes = await safeFetch(`https://api.apify.com/v2/datasets/${s.data?.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
      const items = await itemsRes.json();
      console.log(`\n\n🎉 SUCCESS! Scraped ${items.length} REAL PROPERTIES from Zillow for ${city}!`);
      items.slice(0, 4).forEach((p, idx) => {
        console.log(`\n  🏡 Property ${idx+1}:`);
        console.log(`     📍 Address: ${p.address || p.streetAddress || p.hdpData?.homeInfo?.streetAddress}`);
        console.log(`     💰 Price:   ${p.price || p.unformattedPrice || '$' + p.hdpData?.homeInfo?.price?.toLocaleString()}`);
        console.log(`     🛏  Beds:    ${p.bedrooms || p.hdpData?.homeInfo?.bedrooms} | 🛁 Baths: ${p.bathrooms || p.hdpData?.homeInfo?.bathrooms}`);
        console.log(`     🖼  Image:   ${p.imgSrc || p.mainImage ? '✅ Image Available' : '❌ No Image'}`);
        console.log(`     🔗 Zillow:  ${(p.detailUrl || p.url || '').substring(0, 60)}...`);
      });
      break;
    }
    if (status === 'FAILED') {
      console.log('\n❌ Failed');
      break;
    }
  }
}

async function run() {
  await testCitySearch('Morton Grove', 'IL');
}

run().catch(console.error);
