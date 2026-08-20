// Simulate what startApifyRun does - test dynamic ZIP resolution
async function getZipCodes(city, state) {
  const cityEncoded = encodeURIComponent(city.trim().toLowerCase());
  const stateEncoded = encodeURIComponent(state.trim().toLowerCase());

  const canadaProvinces = {
    'ontario': 'on', 'british columbia': 'bc', 'alberta': 'ab',
    'quebec': 'qc', 'manitoba': 'mb', 'saskatchewan': 'sk',
    'nova scotia': 'ns', 'new brunswick': 'nb',
    'newfoundland and labrador': 'nl', 'prince edward island': 'pe',
    'northwest territories': 'nt', 'yukon': 'yt', 'nunavut': 'nu'
  };

  const stateLower = state.trim().toLowerCase();
  const isCanada = Object.keys(canadaProvinces).includes(stateLower) || Object.values(canadaProvinces).includes(stateLower);
  const provinceCode = isCanada ? (canadaProvinces[stateLower] || stateLower) : null;
  const countryCode = isCanada ? 'ca' : 'us';
  const regionCode = isCanada ? provinceCode : stateEncoded;

  const res = await fetch(`http://api.zippopotam.us/${countryCode}/${regionCode}/${cityEncoded}`);
  if (res.ok) {
    const data = await res.json();
    if (data?.places?.length > 0) return data.places.slice(0, 5).map(p => p['post code']);
  }
  return ['10001']; // fallback
}

async function test() {
  const testCases = [
    { city: 'Chicago', state: 'IL' },
    { city: 'New York', state: 'NY' },
    { city: 'Austin', state: 'TX' },
    { city: 'morton grove', state: 'IL' },
    { city: 'Toronto', state: 'Ontario' },     // Canada full name
    { city: 'Vancouver', state: 'BC' },        // Canada abbreviation
    { city: 'Calgary', state: 'Alberta' },     // Canada full name
    { city: 'Milton', state: 'Ontario' },      // Canada full name
    { city: 'Miami', state: 'FL' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Phoenix', state: 'AZ' },
    { city: 'UnknownCity', state: 'XX' },      // Edge case: should fallback
  ];

  for (const { city, state } of testCases) {
    const zips = await getZipCodes(city, state);
    console.log(`${city}, ${state} => [${zips.join(', ')}]`);
  }
}

test();
