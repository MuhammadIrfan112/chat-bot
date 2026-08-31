const fs = require('fs');
const path = require('path');

async function checkItemContent() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  });

  const token = env.APIFY_API_TOKEN;
  // Check dataset for run e0eEB13iW4frY6jwv
  const runRes = await fetch(`https://api.apify.com/v2/actor-runs/e0eEB13iW4frY6jwv?token=${token}`);
  const runData = await runRes.json();
  const datasetId = runData.data?.defaultDatasetId;
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
  const items = await itemsRes.json();
  console.log('Dataset items raw:', JSON.stringify(items, null, 2));
}

checkItemContent().catch(console.error);
