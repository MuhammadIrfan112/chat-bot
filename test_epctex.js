require('dotenv').config({path: '.env.local'});
async function test() {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/epctex~zillow-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ search: "Chicago, IL", maxItems: 4, proxy: { useApifyProxy: true } }) }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  console.log("EPCTEX RUN ID:", runId);
  if(!runId) { console.log(json); return; }
  await new Promise(r => setTimeout(r, 15000));
  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`);
  const statusData = await statusRes.json();
  const datasetId = statusData?.data?.defaultDatasetId;
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`);
  const items = await itemsRes.json();
  console.log("EPCTEX ITEMS COUNT:", items.length);
  if(items.length > 0) {
    console.log(items[0]);
  }
}
test();
