const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function countDbProperties() {
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

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data: rows, error } = await supabase.from('city_property_data').select('city, properties');
  if (error) {
    console.error('Database query error:', error.message);
    return;
  }

  let totalProperties = 0;
  let totalForSale = 0;
  let totalForRent = 0;
  const cityBreakdown = [];

  rows.forEach(row => {
    const cityName = row.city || 'Unknown';
    const props = Array.isArray(row.properties) ? row.properties : [];
    totalProperties += props.length;

    let citySale = 0;
    let cityRent = 0;

    props.forEach(p => {
      const status = String(p.listing_status || p.status || '').toLowerCase();
      const priceStr = String(p.price || p.priceDisplay || '').toLowerCase();
      const priceNum = typeof p.price === 'number' ? p.price : parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

      const isRent = status.includes('rent') || priceStr.includes('/mo') || priceStr.includes('per month') || (priceNum > 0 && priceNum < 35000);
      if (isRent) {
        cityRent++;
        totalForRent++;
      } else {
        citySale++;
        totalForSale++;
      }
    });

    if (props.length > 0) {
      cityBreakdown.push({
        city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
        total: props.length,
        sale: citySale,
        rent: cityRent
      });
    }
  });

  cityBreakdown.sort((a, b) => b.total - a.total);

  console.log('====================================================');
  console.log(`📊 TOTAL CITIES IN DATABASE: ${cityBreakdown.length}`);
  console.log(`🏡 TOTAL PROPERTIES IN DATABASE: ${totalProperties.toLocaleString()}`);
  console.log(`🟢 FOR SALE PROPERTIES: ${totalForSale.toLocaleString()}`);
  console.log(`🔵 FOR RENT PROPERTIES: ${totalForRent.toLocaleString()}`);
  console.log('====================================================\n');
  console.log('Top Cities Breakdown:');
  cityBreakdown.slice(0, 25).forEach((c, i) => {
    console.log(`${i + 1}. ${c.city.padEnd(18)} Total: ${String(c.total).padEnd(5)} | 🟢 Sale: ${String(c.sale).padEnd(5)} | 🔵 Rent: ${String(c.rent).padEnd(5)}`);
  });
}

countDbProperties().catch(console.error);
