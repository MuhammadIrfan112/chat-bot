// Simulate exact logic of resolveStateOrProvince + startApifyRun ZIP lookup
const CANADIAN_CITY_MAP = {
  toronto: 'ON', mississauga: 'ON', brampton: 'ON', hamilton: 'ON', london: 'ON',
  ottawa: 'ON', milton: 'ON', vancouver: 'BC', surrey: 'BC', burnaby: 'BC',
  calgary: 'AB', edmonton: 'AB', winnipeg: 'MB', saskatoon: 'SK', montreal: 'QC', halifax: 'NS',
};

const US_CITY_MAP = {
  'los angeles': 'CA', 'san francisco': 'CA', 'san diego': 'CA',
  'houston': 'TX', 'dallas': 'TX', 'austin': 'TX',
  'new york': 'NY', 'new york city': 'NY', 'nyc': 'NY',
  'miami': 'FL', 'orlando': 'FL', 'tampa': 'FL',
  'chicago': 'IL', 'morton grove': 'IL', 'naperville': 'IL',
  'phoenix': 'AZ', 'seattle': 'WA', 'boston': 'MA',
  'denver': 'CO', 'las vegas': 'NV', 'atlanta': 'GA',
};

function resolveStateOrProvince(city, detectedState) {
  if (detectedState && detectedState.trim()) return detectedState.trim().toUpperCase();
  const key = (city || '').toLowerCase().trim();
  if (CANADIAN_CITY_MAP[key]) return CANADIAN_CITY_MAP[key];
  if (US_CITY_MAP[key]) return US_CITY_MAP[key];
  return '';
}

async function getZIPs(city, state) {
  const canadaProvinces = {
    'ontario': 'on', 'british columbia': 'bc', 'alberta': 'ab',
    'quebec': 'qc', 'manitoba': 'mb', 'saskatchewan': 'sk',
    'nova scotia': 'ns', 'new brunswick': 'nb',
  };
  const stateLower = state.trim().toLowerCase();
  const isCanada = Object.keys(canadaProvinces).includes(stateLower) || Object.values(canadaProvinces).includes(stateLower);
  const provinceCode = isCanada ? (canadaProvinces[stateLower] || stateLower) : null;
  const countryCode = isCanada ? 'ca' : 'us';
  const regionCode = isCanada ? provinceCode : encodeURIComponent(stateLower);
  const cityEncoded = encodeURIComponent(city.toLowerCase());

  try {
    const res = await fetch(`http://api.zippopotam.us/${countryCode}/${regionCode}/${cityEncoded}`);
    if (res.ok) {
      const d = await res.json();
      if (d?.places?.length > 0) return d.places.slice(0, 5).map(p => p['post code']);
    }
  } catch(e) {}
  return ['10001'];
}

async function test() {
  const testCases = [
    // User types ONLY city (no state) — this was the bug!
    { city: 'Los Angeles', stateFromUser: '' },
    { city: 'Chicago', stateFromUser: '' },
    { city: 'Miami', stateFromUser: '' },
    { city: 'Toronto', stateFromUser: '' },
    { city: 'Vancouver', stateFromUser: '' },
    // User types city + state
    { city: 'Los Angeles', stateFromUser: 'CA' },
    { city: 'New York', stateFromUser: 'NY' },
    { city: 'Houston', stateFromUser: 'TX' },
    // Unknown city
    { city: 'Smallville', stateFromUser: '' },
  ];

  for (const { city, stateFromUser } of testCases) {
    const resolvedState = resolveStateOrProvince(city, stateFromUser);
    if (!resolvedState) {
      console.log(`${city} (state:'${stateFromUser}') => ❌ NO STATE - fallback to NYC ZIPs`);
      continue;
    }
    const zips = await getZIPs(city, resolvedState);
    console.log(`${city} (state:'${stateFromUser}') => resolved:'${resolvedState}' => ZIPs: [${zips.join(', ')}]`);
  }
}

test();
