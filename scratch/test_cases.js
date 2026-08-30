const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeHomeType(val) {
  if (!val) return '';
  const v = String(val).toLowerCase().replace(/_/g, ' ');
  if (v.includes('multi') || v.includes('duplex') || v.includes('triplex')) return 'multi-family';
  if (v.includes('semi') || v.includes('link')) return 'semi-detached';
  if (v.includes('town') || v.includes('row') || v.includes('terrace') || v.includes('attached')) return 'townhouse';
  if (v.includes('condo') || v.includes('apartment') || v.includes('flat') || v.includes('strata') || v.includes('loft') || v.includes('co-op') || v.includes('coop')) return 'condo';
  if (v.includes('lot') || v.includes('land') || v.includes('vacant')) return 'land';
  if (v.includes('manufactured') || v.includes('mobile')) return 'manufactured';
  if (v.includes('villa') || v.includes('luxury')) return 'detached';
  if (v.includes('single') || v.includes('detach') || v.includes('house') || v.includes('residential') || v.includes('bungalow') || v.includes('cottage')) return 'detached';
  return v;
}

function propTypeMatches(p, requestedType) {
  if (!requestedType) return true;
  const rawPropType = String(p.homeType || p.property_type || p.propertyType || p.home_type || p.type || '').toLowerCase();
  const pType = normalizeHomeType(rawPropType);
  const requestedTypes = requestedType.toLowerCase().split(',').map(t => t.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim()).filter(Boolean);

  return requestedTypes.some(req => {
    if (req.includes('multi') || req.includes('duplex') || req.includes('triplex')) return pType === 'multi-family' || rawPropType.includes('multi');
    if (req.includes('town')) return pType === 'townhouse';
    if (req.includes('condo') || req.includes('apartment') || req.includes('flat') || req.includes('strata')) return pType === 'condo';
    if (req.includes('land') || req.includes('lot') || req.includes('vacant')) return pType === 'land';
    if (req.includes('manufactured') || req.includes('mobile')) return pType === 'manufactured';
    if (req.includes('villa') || req.includes('luxury')) return 'detached';
    if ((req.includes('detach') && !req.includes('semi')) || req.includes('single') || req.includes('house')) return pType === 'detached';
    if (req.includes('semi') || req.includes('link')) return pType === 'semi-detached' || pType === 'townhouse';
    return pType.includes(req);
  });
}

async function testCases() {
  const tests = [
    { city: 'mississauga', intent: 'buy', type: 'townhouse', budget: 677000 },
    { city: 'mississauga', intent: 'buy', type: 'manufactured, detached house', budget: 877000 },
    { city: 'hamilton', intent: 'rent', type: 'apartment/condo', budget: 3000 },
    { city: 'toronto', intent: 'buy', type: 'condo / apartment', budget: 550000 }
  ];

  for (const t of tests) {
    const { data } = await supabase.from('city_property_data').select('*').eq('city', t.city).single();
    const props = data?.properties || [];
    const isRent = t.intent === 'rent';
    const intentFiltered = props.filter(p => isRent ? (p.isForRent || String(p.price).includes('/mo')) : (!p.isForRent && !String(p.price).includes('/mo')));
    const typeFiltered = intentFiltered.filter(p => propTypeMatches(p, t.type));
    console.log(`[TEST] City=${t.city} Intent=${t.intent} Type="${t.type}" Budget=${t.budget} => Matched=${typeFiltered.length}`);
    typeFiltered.slice(0, 3).forEach(p => console.log(`   - ${p.address} | Price: ${p.price} | Type: ${p.property_type} | Beds: ${p.bedrooms}`));
  }
}
testCases();
