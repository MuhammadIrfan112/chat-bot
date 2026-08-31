const fs = require('fs');
const path = require('path');

async function testScrape() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  });

  const token = env.APIFY_API_TOKEN;

  // Let's get Nominatim bounding box for Dallas, TX
  const geoRes = await fetch('https://nominatim.openstreetmap.org/search?q=Dallas,%20TX&format=json&limit=1', {
    headers: { 'User-Agent': 'RealtyBotTest/1.0' }
  });
  const geoData = await geoRes.json();
  const box = geoData[0]?.boundingbox; // [south, north, west, east]
  console.log('Geo boundingbox:', box);

  const south = parseFloat(box[0]);
  const north = parseFloat(box[1]);
  const west = parseFloat(box[2]);
  const east = parseFloat(box[3]);

  const searchQueryState = {
    pagination: {},
    usersSearchTerm: "Dallas, TX",
    mapBounds: { west, east, south, north },
    isMapVisible: true,
    isListVisible: true,
    filterState: {
      sort: { value: "days" },
      ah: { value: true },
      isForSaleByAgent: { value: true },
      isForSaleByOwner: { value: true },
      isNewConstruction: { value: true },
      isComingSoon: { value: true },
      isAuction: { value: true },
      isForSaleForeclosure: { value: true },
      isCondo: { value: true },
      isApartment: { value: true }
    }
  };

  const encoded = encodeURIComponent(JSON.stringify(searchQueryState));
  const searchUrl = `https://www.zillow.com/dallas-tx/?searchQueryState=${encoded}`;
  console.log('Search URL:', searchUrl);

  const runRes = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls: [{ url: searchUrl }],
      searchUrls: [{ url: searchUrl }],
      extractionMethod: "PAGINATION_WITH_ZOOM_IN",
      proxy: { useApifyProxy: true }
    })
  });

  const runData = await runRes.json();
  console.log('Run started:', runData.data?.id, 'Status:', runData.data?.status);
}

testScrape().catch(console.error);
