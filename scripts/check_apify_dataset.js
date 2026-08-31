const fs = require('fs');
const path = require('path');

async function fetchWithRetry(url, options = {}, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

async function inspectRecentDatasets() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    }
  });

  const token = env.APIFY_API_TOKEN;
  const res = await fetchWithRetry(`https://api.apify.com/v2/actor-runs?limit=6&desc=1&token=${token}`);
  const data = await res.json();
  const runs = data.data?.items || [];

  for (const r of runs) {
    console.log('\n======================================================');
    console.log(`Run ID: ${r.id} | Status: ${r.status} | Finished: ${r.finishedAt}`);
    
    try {
      const inputRes = await fetchWithRetry(`https://api.apify.com/v2/key-value-stores/${r.defaultKeyValueStoreId}/records/INPUT?token=${token}`);
      const input = await inputRes.json();
      console.log(`Input:`, JSON.stringify(input));
    } catch (e) {
      console.log('Error fetching input:', e.message);
    }

    try {
      const datasetRes = await fetchWithRetry(`https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?token=${token}&limit=10`);
      const items = await datasetRes.json();
      console.log(`Dataset items count:`, items.length);
      if (items.length > 0) {
        console.log(`Sample item address:`, items[0]?.address || items[0]?.streetAddress || items[0]?.unformattedPrice);
        console.log(`Sample item homeType:`, items[0]?.homeType || items[0]?.propertyType);
        console.log(`Sample item price:`, items[0]?.price || items[0]?.unformattedPrice);
      }
    } catch (e) {
      console.log('Error fetching dataset:', e.message);
    }
  }
}

inspectRecentDatasets().catch(console.error);
