const fs = require('fs');
const path = require('path');

async function checkApifyRuns() {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (e) {
    envContent = fs.readFileSync('.env.local', 'utf8');
  }

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
  const res = await fetch(`https://api.apify.com/v2/actor-runs?limit=8&desc=1&token=${token}`);
  const data = await res.json();
  const runs = data.data?.items || [];
  for (const r of runs) {
    const inputRes = await fetch(`https://api.apify.com/v2/key-value-stores/${r.defaultKeyValueStoreId}/records/INPUT?token=${token}`);
    const inputData = await inputRes.json();
    console.log('RunId:', r.id, 'Status:', r.status, 'Items:', r.usageTotalUsd, 'Input:', JSON.stringify(inputData));
  }
}
checkApifyRuns().catch(console.error);
