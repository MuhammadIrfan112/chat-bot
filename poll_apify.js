require('dotenv').config({path: '.env.local'});
async function check() {
  const token = process.env.APIFY_API_TOKEN;
  const runId = '2XxcJ42I8ZcFaajx6';
  
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const s = await statusRes.json();
    console.log(`[${(i+1)*10}s] Status:`, s.data?.status, '-', s.data?.statusMessage);
    if (s.data?.status === 'SUCCEEDED' || s.data?.status === 'FAILED') {
      if (s.data?.status === 'SUCCEEDED') {
        const dRes = await fetch(`https://api.apify.com/v2/datasets/${s.data.defaultDatasetId}/items?token=${token}`);
        const items = await dRes.json();
        console.log("ITEMS:", items.length);
        if(items.length > 0) console.log("Sample:", JSON.stringify(items[0]).substring(0, 300));
      }
      break;
    }
  }
}
check();
