const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function syncAllPastApifyRuns() {
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
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  });

  const apifyToken = env.APIFY_API_TOKEN;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apifyToken || !supabaseUrl || !supabaseKey) {
    console.log('Missing env variables:', { hasApify: !!apifyToken, hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching recent Apify runs...');
  const res = await fetch(`https://api.apify.com/v2/actor-runs?limit=50&desc=1&token=${apifyToken}`);
  const data = await res.json();
  const runs = data.data?.items || [];
  console.log(`Found ${runs.length} recent Apify runs.`);

  const cityMap = {};

  for (const run of runs) {
    if (run.status !== 'SUCCEEDED') continue;
    const datasetId = run.defaultDatasetId;
    if (!datasetId) continue;

    try {
      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=100`);
      const items = await itemsRes.json();
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const p of items) {
        let city = '';
        if (typeof p.city === 'string' && p.city.trim()) {
          city = p.city.trim();
        } else if (typeof p.addressCity === 'string' && p.addressCity.trim()) {
          city = p.addressCity.trim();
        } else if (p.hdpData?.homeInfo?.city) {
          city = p.hdpData.homeInfo.city.trim();
        } else if (p.location?.address && typeof p.location.address === 'string' && p.location.address.includes(',')) {
          city = p.location.address.split(',')[1]?.replace(/\(.*?\)/g, '').trim();
        } else if (p.address && typeof p.address === 'string' && p.address.includes(',')) {
          city = p.address.split(',')[1]?.replace(/\(.*?\)/g, '').trim();
        } else if (p.Property?.Address?.AddressText && p.Property.Address.AddressText.includes('|')) {
          city = p.Property.Address.AddressText.split('|')[1]?.trim();
        }

        if (!city) continue;
        const cityKey = city.toLowerCase().trim();
        if (!cityMap[cityKey]) cityMap[cityKey] = [];

        const key = (p.url || p.address || p.id || p.zpid || p.mls_number || JSON.stringify(p)).toLowerCase().trim();
        const exists = cityMap[cityKey].some(x => (x.url || x.address || x.id || x.zpid || x.mls_number || JSON.stringify(x)).toLowerCase().trim() === key);
        if (!exists) {
          cityMap[cityKey].push(p);
        }
      }
    } catch (e) {
      console.error(`Error fetching dataset ${datasetId}:`, e.message);
    }
  }

  const citiesFound = Object.keys(cityMap);
  console.log(`Extracted properties for ${citiesFound.length} cities:`, citiesFound.map(c => `${c} (${cityMap[c].length})`));

  for (const city of citiesFound) {
    const props = cityMap[city];
    if (!props || props.length === 0) continue;

    const { data: existing } = await supabase
      .from('city_property_data')
      .select('properties')
      .eq('city', city)
      .single();

    const existingProps = Array.isArray(existing?.properties) ? existing.properties : [];
    const seen = new Set(existingProps.map(p => (p.address || p.url || p.zpid || p.mls_number || JSON.stringify(p)).toLowerCase().trim()));
    const merged = [...existingProps];

    for (const p of props) {
      const k = (p.address || p.url || p.zpid || p.mls_number || JSON.stringify(p)).toLowerCase().trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        merged.push(p);
      }
    }

    const { error } = await supabase.from('city_property_data').upsert({
      city: city,
      properties: merged,
      last_scraped_at: new Date().toISOString()
    }, { onConflict: 'city' });

    if (error) {
      console.error(`Error saving ${city}:`, error.message);
    } else {
      console.log(`✅ Saved/merged ${merged.length} properties for "${city}" in Supabase DB.`);
    }
  }

  console.log('🎉 All past Apify properties synced to Supabase successfully!');
}

syncAllPastApifyRuns().catch(err => console.error('Fatal sync error:', err));
