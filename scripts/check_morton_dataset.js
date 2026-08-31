const fs = require('fs');

async function check() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  });

  const token = env.APIFY_API_TOKEN;
  let items = null;
  for (let i = 0; i < 5; i++) {
    try {
      const runRes = await fetch(`https://api.apify.com/v2/actor-runs/NangbaPScElFvXnUd?token=${token}`);
      const runData = await runRes.json();
      const datasetId = runData.data?.defaultDatasetId;
      const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      items = await res.json();
      break;
    } catch(e) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log('Dataset items count for Morton Grove Condo run:', items?.length);
  items?.forEach((item, i) => {
    console.log(`[${i+1}] ${item.address || item.streetAddress} | Price: ${item.price || item.unformattedPrice} | Type: ${item.homeType || item.propertyType}`);
  });
}

check().catch(console.error);
