const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function syncAndCheck() {
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
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Check last runs
  const res = await fetch(`https://api.apify.com/v2/actor-runs?limit=10&desc=1&token=${token}`);
  const data = await res.json();
  const runs = data.data?.items || [];

  console.log('Recent Runs Cost & Item Summary:');
  let totalSynced = 0;

  for (const r of runs) {
    console.log(`Run ${r.id} | Status: ${r.status} | Cost: $${r.usageTotalUsd?.toFixed(4) || 0}`);
    if (r.status === 'SUCCEEDED' && r.defaultDatasetId) {
      // Fetch all items from dataset
      const dRes = await fetch(`https://api.apify.com/v2/datasets/${r.defaultDatasetId}/items?token=${token}&limit=200`);
      const items = await dRes.json();
      if (Array.isArray(items) && items.length > 0 && !items[0].error) {
        console.log(`  -> Found ${items.length} properties in dataset ${r.defaultDatasetId}`);
        
        // Group by city
        const cityMap = {};
        items.forEach(item => {
          const rawCity = item.addressCity || item.city || (item.address ? item.address.split(',')[1]?.trim() : '') || 'dallas';
          const cleanCity = rawCity.toLowerCase().trim();
          if (!cleanCity) return;
          if (!cityMap[cleanCity]) cityMap[cleanCity] = [];

          const price = item.unformattedPrice ? `$${Number(item.unformattedPrice).toLocaleString()}` : (item.price || item.listingPrice?.formatted || '');
          const img = item.mainImage || (item.listingPhotos && item.listingPhotos[0]?.url) || '';
          const photos = (item.listingPhotos || []).map(p => p.url).filter(Boolean);

          cityMap[cleanCity].push({
            id: item.zpid || String(Date.now() + Math.random()),
            address: item.address || item.streetAddress || '',
            city: cleanCity,
            state: item.addressState || item.state || 'TX',
            price,
            bedrooms: item.beds || item.bedrooms || 3,
            bathrooms: item.baths || item.bathrooms || 2,
            property_type: item.homeType || 'Condo',
            image_url: img,
            images: photos.length > 0 ? photos : [img],
            url: item.propertyUrl || `https://www.zillow.com/homedetails/${item.zpid}_zpid/`,
            listing_status: '🟢 For Sale',
            mls_number: item.zpid || ''
          });
        });

        // Save each city to Supabase city_property_data
        for (const [cityKey, newProps] of Object.entries(cityMap)) {
          const { data: existing } = await supabase.from('city_property_data').select('properties').eq('city', cityKey).single();
          const oldProps = existing?.properties || [];
          
          // Merge deduplicating by address/url
          const seen = new Set();
          const merged = [];
          [...newProps, ...oldProps].forEach(p => {
            const k = (p.address || p.url || p.id).toLowerCase().trim();
            if (!seen.has(k)) {
              seen.add(k);
              merged.push(p);
            }
          });

          const { error } = await supabase.from('city_property_data').upsert({
            city: cityKey,
            properties: merged,
            last_scraped_at: new Date().toISOString()
          }, { onConflict: 'city' });

          if (!error) {
            console.log(`  -> ✅ Saved ${merged.length} total properties for "${cityKey}" to Supabase!`);
            totalSynced += newProps.length;
          } else {
            console.error(`  -> DB save error for "${cityKey}":`, error.message);
          }
        }
      }
    }
  }

  console.log(`\n🎉 Total fresh properties synced to Supabase DB: ${totalSynced}`);
}

syncAndCheck().catch(console.error);
