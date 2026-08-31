import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();
  if (!APIFY_TOKEN) {
    return Response.json({ success: false, error: 'APIFY_API_TOKEN not set' }, { status: 500 });
  }

  try {
    // 1. Fetch last 50 runs from Apify
    const runsRes = await fetch(`https://api.apify.com/v2/actor-runs?limit=50&desc=1&token=${APIFY_TOKEN}`);
    const runsData = await runsRes.json();
    const runs = runsData?.data?.items || [];

    console.log(`[sync-apify-history] Found ${runs.length} recent Apify runs.`);

    const cityMap = {};
    let totalFetched = 0;

    for (const run of runs) {
      if (run.status !== 'SUCCEEDED') continue;
      const datasetId = run.defaultDatasetId;
      if (!datasetId) continue;

      try {
        const itemsRes = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
        );
        const items = await itemsRes.json();
        if (!Array.isArray(items) || items.length === 0) continue;
        totalFetched += items.length;

        for (const p of items) {
          // Resolve city from all known field patterns
          let city = '';
          if (typeof p.city === 'string' && p.city.trim()) {
            city = p.city.trim();
          } else if (typeof p.addressCity === 'string' && p.addressCity.trim()) {
            city = p.addressCity.trim();
          } else if (p.hdpData?.homeInfo?.city) {
            city = p.hdpData.homeInfo.city.trim();
          } else if (p.location?.address && typeof p.location.address === 'string' && p.location.address.includes(',')) {
            city = p.location.address.split(',')[1]?.replace(/\(.*?\)/g, '').trim();
          } else if (typeof p.address === 'string' && p.address.includes(',')) {
            city = p.address.split(',')[1]?.replace(/\(.*?\)/g, '').trim();
          } else if (p.Property?.Address?.AddressText && p.Property.Address.AddressText.includes('|')) {
            city = p.Property.Address.AddressText.split('|')[1]?.trim();
          } else if (p.streetAddress && p.city) {
            city = p.city;
          }

          if (!city) continue;
          const cityKey = city.toLowerCase().replace(/\(.*?\)/g, '').trim();
          if (!cityKey) continue;

          if (!cityMap[cityKey]) cityMap[cityKey] = [];

          const key = (p.url || p.address || String(p.id || p.zpid || p.mls_number || '')).toLowerCase().trim();
          const exists = cityMap[cityKey].some(x =>
            (x.url || x.address || String(x.id || x.zpid || x.mls_number || '')).toLowerCase().trim() === key
          );
          if (!exists) {
            cityMap[cityKey].push(p);
          }
        }
      } catch (datasetErr) {
        console.error(`[sync-apify-history] Error reading dataset ${datasetId}:`, datasetErr.message);
      }
    }

    const citiesFound = Object.keys(cityMap);
    console.log(`[sync-apify-history] Resolved ${totalFetched} total properties across ${citiesFound.length} cities.`);

    const results = [];

    // 2. Upsert each city into city_property_data with deduplication merge
    for (const city of citiesFound) {
      const newProps = cityMap[city];
      if (!newProps || newProps.length === 0) continue;

      const { data: existing } = await supabaseAdmin
        .from('city_property_data')
        .select('properties')
        .eq('city', city)
        .single();

      const existingProps = Array.isArray(existing?.properties) ? existing.properties : [];
      const seen = new Set(
        existingProps.map(p =>
          (p.url || p.address || String(p.id || p.zpid || p.mls_number || '')).toLowerCase().trim()
        )
      );
      const merged = [...existingProps];

      for (const p of newProps) {
        const k = (p.url || p.address || String(p.id || p.zpid || p.mls_number || '')).toLowerCase().trim();
        if (k && !seen.has(k)) {
          seen.add(k);
          merged.push(p);
        }
      }

      const { error } = await supabaseAdmin.from('city_property_data').upsert(
        {
          city: city,
          properties: merged,
          last_scraped_at: new Date().toISOString()
        },
        { onConflict: 'city' }
      );

      if (error) {
        console.error(`[sync-apify-history] DB error for ${city}:`, error.message);
        results.push({ city, saved: false, error: error.message });
      } else {
        console.log(`[sync-apify-history] ✅ Saved ${merged.length} props for "${city}".`);
        results.push({ city, saved: true, total: merged.length, newAdded: merged.length - existingProps.length });
      }
    }

    return Response.json({
      success: true,
      totalRunsChecked: runs.length,
      totalPropertiesFetched: totalFetched,
      citiesProcessed: citiesFound.length,
      results
    });

  } catch (err) {
    console.error('[sync-apify-history] Fatal error:', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
