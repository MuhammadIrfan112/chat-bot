const fetch = require('node-fetch');
async function test() {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) { console.log('NO TOKEN'); return; }
  
  const citySlug = 'miltion,ontraio';
  const searchQueryState = JSON.stringify({ pagination: {}, isMapVisible: false, filterState: { isForSaleByOwner: { value: false }, isForSaleByAgent: { value: true } }, isListVisible: true, mapZoom: 11 });
  const searchUrl = `https://www.zillow.com/${citySlug}/homes/?searchQueryState=${encodeURIComponent(searchQueryState)}`;
  
  try {
    const runRes = await fetch(
        `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${APIFY_TOKEN}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchUrls: [{ url: searchUrl }], maxItems: 4, proxy: { useApifyProxy: true } }) }
    );
    console.log("STATUS:", runRes.status);
    const json = await runRes.json();
    console.log("RESPONSE:", json.error || json.data?.id);
  } catch (err) {
    console.log("ERROR:", err.message);
  }
}
test();
