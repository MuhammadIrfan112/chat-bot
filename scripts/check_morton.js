const fs = require('fs');
const path = require('path');

async function inspectMortonGroveRun() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  });

  const token = env.APIFY_API_TOKEN;
  const res = await fetch(`https://api.apify.com/v2/actor-runs?limit=3&desc=1&token=${token}`);
  const data = await res.json();
  const runs = data.data?.items || [];

  for (const r of runs) {
    console.log('\n======================================================');
    console.log(`Run ID: ${r.id} | Status: ${r.status} | Finished: ${r.finishedAt}`);
    
    const inputRes = await fetch(`https://api.apify.com/v2/key-value-stores/${r.defaultKeyValueStoreId}/records/INPUT?token=${token}`);
    const input = await inputRes.json();
    console.log(`Input URL:`, input?.startUrls?.[0]?.url || input?.searchUrls?.[0]?.url);

    const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?token=${token}`);
    const items = await datasetRes.json();
    console.log(`Dataset items total count:`, items.length);
    items.forEach((item, i) => {
      console.log(`  [${i+1}] ${item.address || item.streetAddress} | Price: ${item.price || item.unformattedPrice} | Type: ${item.homeType || item.propertyType}`);
    });
  }
}

inspectMortonGroveRun().catch(console.error);
