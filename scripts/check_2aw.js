const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
});

async function check() {
  const token = env.APIFY_API_TOKEN;
  const runRes = await fetch(`https://api.apify.com/v2/actor-runs/2AWVQwbMpWmTSEGds?token=${token}`);
  const runData = await runRes.json();
  console.log('Status:', runData.data?.status);
  const datasetId = runData.data?.defaultDatasetId;
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
  const items = await itemsRes.json();
  console.log('Items Count:', items.length);
  if (items.length > 0) {
    console.log('Sample item 0:', JSON.stringify(items[0], null, 2));
  }
}
check().catch(console.error);
