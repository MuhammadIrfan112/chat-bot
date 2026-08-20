require('dotenv').config({path: '.env.local'});
// Test the maxcopell~zillow-scraper with the exact JSON input format from their documentation
// NOT searchUrls - but individual property searches
async function test() {
  const token = process.env.APIFY_API_TOKEN;
  
  // According to maxcopell docs, you must use a URL that looks like the Zillow search page
  // The correct format uses a direct Zillow search URL
  
  // Let me test with their exact example format from README
  const input = {
    "searchUrls": [
      {
        "url": "https://www.zillow.com/chicago-il/homes/for_sale/",
      }
    ],
    "maxItems": 3,
    "proxy": {
      "useApifyProxy": true,
      "apifyProxyGroups": ["RESIDENTIAL"]
    }
  };
  
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${token}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  console.log("RUN ID:", runId, "STATUS:", json.data?.status);
  if(!runId) { console.log("Error:", JSON.stringify(json)); return; }
  
  await new Promise(r => setTimeout(r, 12000));
  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
  const s = await statusRes.json();
  console.log('Status:', s.data?.status, '-', s.data?.statusMessage);
  if (s.data?.status === 'SUCCEEDED') {
    const dRes = await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${token}`);
    const items = await dRes.json();
    console.log("ITEMS:", items.length);
    if(items.length > 0) console.log("Sample:", JSON.stringify(items[0]).substring(0, 200));
  }
}
test();
