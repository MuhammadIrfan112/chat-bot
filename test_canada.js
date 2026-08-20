require('dotenv').config({path: '.env.local'});
async function test() {
  const token = process.env.APIFY_API_TOKEN;
  
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/maxcopell~zillow-zip-search/runs?token=${token}`,
    { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        zipCodes: ["L9T"], // Milton ON
        status: "forSale",
        maxItems: 3
      }) 
    }
  );
  const json = await runRes.json();
  const runId = json.data?.id;
  console.log("RUN ID:", runId);
  
  if (runId) {
    for (let j = 0; j < 5; j++) {
      await new Promise(r => setTimeout(r, 6000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      const s = await statusRes.json();
      if (s.data?.status === 'SUCCEEDED' || s.data?.status === 'FAILED') {
        console.log(`Status: ${s.data.status} - ${s.data.statusMessage || ''}`);
        if(s.data?.status === 'SUCCEEDED') {
           const dRes = await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${token}`);
           const items = await dRes.json();
           console.log("ITEMS COUNT:", items.length);
        }
        break;
      }
    }
  }
}
test();
