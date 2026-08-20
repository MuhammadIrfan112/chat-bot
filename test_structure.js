require('dotenv').config({path: '.env.local'});
async function test() {
  const token = process.env.APIFY_API_TOKEN;
  
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/maxcopell~zillow-zip-search/runs?token=${token}`,
    { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        zipCodes: ["10001"],
        status: "forSale",
        maxItems: 1
      }) 
    }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  
  if (runId) {
    for (let j = 0; j < 10; j++) {
      await new Promise(r => setTimeout(r, 6000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const s = await statusRes.json();
      if (s.data?.status === 'SUCCEEDED') {
           const dRes = await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${token}`);
           const items = await dRes.json();
           console.log(JSON.stringify(items[0], null, 2));
           break;
      }
    }
  }
}
test();
