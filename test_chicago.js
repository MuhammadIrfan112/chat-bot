require('dotenv').config({path: '.env.local'});
async function test() {
  const searchUrl = 'https://www.zillow.com/chicago-il/';
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchUrls: [{ url: searchUrl }], maxItems: 4, proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } }) }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  console.log("RUN ID:", runId);
  await new Promise(r => setTimeout(r, 12000));
  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`);
  const statusData = await statusRes.json();
  const datasetId = statusData?.data?.defaultDatasetId;
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`);
  const items = await itemsRes.json();
  console.log("CHICAGO ITEMS COUNT (NO HOMES/):", items.length);
  if(items.length > 0) console.log(items[0].error || items[0].address);
}
test();
