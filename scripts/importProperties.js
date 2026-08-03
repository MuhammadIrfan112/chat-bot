// Script to import properties.json into Supabase
// Run with: node scripts/importProperties.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env manually
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE env variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load properties.json
const propertiesPath = path.join(__dirname, '../src/data/properties.json');
const raw = fs.readFileSync(propertiesPath, 'utf-8');
const properties = JSON.parse(raw);

console.log(`✅ Loaded ${properties.length} properties from JSON`);

// Map to clean DB rows
function mapProperty(p) {
  // Get price amount
  let priceAmount = null;
  let priceFormatted = null;
  if (p.listingPrice?.amount) {
    priceAmount = p.listingPrice.amount;
    priceFormatted = p.listingPrice.formatted;
  } else if (p.price) {
    priceFormatted = p.price;
    priceAmount = parseInt(p.price.replace(/[^0-9]/g, '')) || null;
  } else if (p.units && p.units.length > 0) {
    priceFormatted = p.units[0]?.price || null;
    priceAmount = parseInt((p.units[0]?.price || '').replace(/[^0-9]/g, '')) || null;
  }

  // Get bedrooms
  let bedrooms = p.bedrooms || null;
  if (!bedrooms && p.units && p.units.length > 0) {
    bedrooms = p.units[0]?.beds ? parseInt(p.units[0].beds) : null;
  }

  return {
    zpid: String(p.zpid || p.id || ''),
    listing_status: p.listingStatus || p.statusType?.toLowerCase().replace('_', '') || null,
    home_type: p.homeType || p.cardType || null,
    address_full: p.listingAddress?.full || p.address || null,
    address_street: p.listingAddress?.street || p.addressStreet || null,
    address_city: p.listingAddress?.city || p.addressCity || 'Morton Grove',
    address_state: p.listingAddress?.state || p.addressState || 'IL',
    address_zip: p.listingAddress?.zipCode || p.addressZipcode || null,
    price_amount: priceAmount,
    price_formatted: priceFormatted,
    bedrooms: bedrooms,
    bathrooms: p.bathrooms || null,
    living_area: p.livingArea || null,
    main_image: p.mainImage || p.imgSrc || null,
    property_url: p.propertyUrl || p.detailUrl || null,
    days_on_zillow: p.daysOnZillow || null,
    zestimate: p.zestimate || null,
    rent_zestimate: p.rentZestimate || null,
    latitude: p.coordinates?.latitude || p.latLong?.latitude || null,
    longitude: p.coordinates?.longitude || p.latLong?.longitude || null,
    has_parking: null, // not in zillow data directly
    pets_allowed: null,
    availability_date: p.availabilityDate || null,
  };
}

async function importToSupabase() {
  const rows = properties.map(mapProperty).filter(r => r.main_image && r.property_url);

  console.log(`📦 ${rows.length} valid properties to insert (with image + URL)`);

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('morton_grove_properties')
      .upsert(batch, { onConflict: 'zpid' });

    if (error) {
      console.error(`❌ Error at batch ${i / batchSize + 1}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} — Total: ${inserted}`);
    }
  }

  console.log(`\n🎉 Done! ${inserted} properties saved to Supabase.`);
}

importToSupabase();
