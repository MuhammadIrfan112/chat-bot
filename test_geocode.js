async function test() {
  // US: use api.zippopotam.us  - most reliable for US cities
  const usTests = [
    { city: 'chicago', state: 'il' },
    { city: 'austin', state: 'tx' },
    { city: 'seattle', state: 'wa' },
    { city: 'springfield', state: 'il' },
    { city: 'miami', state: 'fl' },
    { city: 'phoenix', state: 'az' },
    { city: 'dallas', state: 'tx' },
  ];

  console.log('=== US Cities via zippopotam.us ===');
  for (const { city, state } of usTests) {
    const res = await fetch(`http://api.zippopotam.us/us/${state}/${city}`);
    if (res.ok) {
      const data = await res.json();
      const zips = data.places.map(p => p['post code']);
      console.log(`${city}, ${state} => ZIPs: [${zips.slice(0,3).join(', ')}]`);
    } else {
      console.log(`${city}, ${state} => NOT FOUND (${res.status})`);
    }
  }

  // Canada: try canada-postcodes API
  console.log('\n=== Canadian Cities via zippopotam.us ===');
  const caTests = [
    { city: 'toronto', province: 'on' },
    { city: 'vancouver', province: 'bc' },
    { city: 'calgary', province: 'ab' },
    { city: 'milton', province: 'on' },
  ];
  for (const { city, province } of caTests) {
    const res = await fetch(`http://api.zippopotam.us/ca/${province}/${city}`);
    if (res.ok) {
      const data = await res.json();
      const zips = data.places.map(p => p['post code']);
      console.log(`${city}, ${province} => Postal: [${zips.slice(0,3).join(', ')}]`);
    } else {
      console.log(`${city}, ${province} => NOT FOUND (${res.status})`);
    }
  }
}
test();
