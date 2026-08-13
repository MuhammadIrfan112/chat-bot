require('dotenv').config({path: '.env.local'});
async function test() {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  const searchQueryState = JSON.stringify({ pagination: {}, isMapVisible: false, filterState: { isForSaleByOwner: { value: false }, isForSaleByAgent: { value: true } }, isListVisible: true, mapZoom: 11 });
  const searchUrl = `https://www.zillow.com/new-york-ny/homes/?searchQueryState=${encodeURIComponent(searchQueryState)}`;
  
  const runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${APIFY_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchUrls: [{ url: searchUrl }], maxItems: 4, proxy: { useApifyProxy: true } }) }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  console.log("RUN ID:", runId);
  
  // wait 10 seconds
  await new Promise(r => setTimeout(r, 10000));
  
  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
  const statusData = await statusRes.json();
  const datasetId = statusData?.data?.defaultDatasetId;
  
  if (datasetId) {
    const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
    const items = await itemsRes.json();
    console.log("ITEMS COUNT:", items.length);
    if (items.length > 0) {
      console.log(JSON.stringify(items[0], null, 2).substring(0, 200));
    }
  }
}
test();
