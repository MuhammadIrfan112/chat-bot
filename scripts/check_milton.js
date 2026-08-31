const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function checkMilton() {
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
  const { data, error } = await supabase.from('city_property_data').select('city, properties').ilike('city', 'milton');
  if (error) { console.error('DB Error:', error); return; }
  const props = data[0]?.properties || [];
  console.log('Total Milton properties in DB:', props.length);
  const types = {};
  props.forEach(p => {
    const t = p.property_type || p.propertyType || p.homeType || p.type || 'Unknown';
    types[t] = (types[t] || 0) + 1;
  });
  console.log('Property types breakdown in Milton:', JSON.stringify(types, null, 2));
  
  const townhouses = props.filter(p => {
    const t = (p.property_type || p.propertyType || p.homeType || p.type || '').toLowerCase();
    return t.includes('town') || t.includes('row') || t.includes('semi');
  });
  console.log('Total Townhouses in Milton DB:', townhouses.length);
  console.log('Townhouse prices in Milton DB:', townhouses.map(t => ({ addr: t.address, price: t.price })));
}
checkMilton().catch(console.error);
