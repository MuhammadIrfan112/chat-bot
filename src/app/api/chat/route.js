import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as cheerio from 'cheerio';
import OpenAI from "openai";
import faqsData from '@/data/faqs.json';
import Fuse from 'fuse.js';

let fuseInstance = null;



// ─── Comprehensive City → State/Province Auto-Resolver ───────────────────────
// Covers 500+ major cities across all 50 US states + all Canadian provinces.
// Used to auto-resolve state when user types just a city name without a state.
const CITY_STATE_MAP = {
  // ── ALABAMA ──
  birmingham: 'AL', montgomery: 'AL', huntsville: 'AL', mobile: 'AL', tuscaloosa: 'AL',
  hoover: 'AL', dothan: 'AL', auburn: 'AL', decatur: 'AL', madison: 'AL',
  // ── ALASKA ──
  anchorage: 'AK', fairbanks: 'AK', juneau: 'AK', sitka: 'AK', ketchikan: 'AK',
  // ── ARIZONA ──
  phoenix: 'AZ', tucson: 'AZ', mesa: 'AZ', chandler: 'AZ', scottsdale: 'AZ',
  tempe: 'AZ', glendale: 'AZ', gilbert: 'AZ', peoria: 'AZ', surprise: 'AZ',
  yuma: 'AZ', avondale: 'AZ', flagstaff: 'AZ', goodyear: 'AZ', 'lake havasu city': 'AZ',
  // ── ARKANSAS ──
  'little rock': 'AR', 'fort smith': 'AR', fayetteville: 'AR', springdale: 'AR',
  jonesboro: 'AR', conway: 'AR', rogers: 'AR', bentonville: 'AR',
  // ── CALIFORNIA ──
  'los angeles': 'CA', 'san diego': 'CA', 'san jose': 'CA', 'san francisco': 'CA',
  fresno: 'CA', sacramento: 'CA', 'long beach': 'CA', oakland: 'CA',
  bakersfield: 'CA', anaheim: 'CA', 'santa ana': 'CA', riverside: 'CA',
  stockton: 'CA', irvine: 'CA', 'chula vista': 'CA', fremont: 'CA',
  'san bernardino': 'CA', modesto: 'CA', fontana: 'CA', 'moreno valley': 'CA',
  glendale: 'CA', 'huntington beach': 'CA', oxnard: 'CA', ontario: 'CA',
  'santa clarita': 'CA', 'garden grove': 'CA', oceanside: 'CA', 'rancho cucamonga': 'CA',
  'santa rosa': 'CA', 'elk grove': 'CA', corona: 'CA', 'san buenaventura': 'CA',
  pasadena: 'CA', hayward: 'CA', salinas: 'CA', 'pomona': 'CA',
  torrance: 'CA', escondido: 'CA', sunnyvale: 'CA', 'thousand oaks': 'CA',
  palmdale: 'CA', 'santa barbara': 'CA', 'san mateo': 'CA', 'san leandro': 'CA',
  concord: 'CA', 'east los angeles': 'CA', visalia: 'CA', 'el monte': 'CA',
  'santa clara': 'CA', 'simi valley': 'CA', berkeley: 'CA', 'west covina': 'CA',
  compton: 'CA', 'richmond ca': 'CA', murrieta: 'CA', temecula: 'CA', inglewood: 'CA',
  // ── COLORADO ──
  denver: 'CO', 'colorado springs': 'CO', aurora: 'CO', 'fort collins': 'CO',
  lakewood: 'CO', thornton: 'CO', arvada: 'CO', westminster: 'CO',
  pueblo: 'CO', 'centennial co': 'CO', boulder: 'CO', 'highlands ranch': 'CO',
  'greeley co': 'CO', longmont: 'CO',
  // ── CONNECTICUT ──
  bridgeport: 'CT', 'new haven': 'CT', hartford: 'CT', stamford: 'CT',
  waterbury: 'CT', norwalk: 'CT', danbury: 'CT', 'new britain': 'CT',
  // ── DELAWARE ──
  wilmington: 'DE', dover: 'DE', newark: 'DE',
  // ── FLORIDA ──
  jacksonville: 'FL', miami: 'FL', tampa: 'FL', orlando: 'FL',
  'st. petersburg': 'FL', 'saint petersburg': 'FL', hialeah: 'FL', 'fort lauderdale': 'FL',
  tallahassee: 'FL', pembroke: 'FL', hollywood: 'FL', miramar: 'FL',
  'cape coral': 'FL', gainesville: 'FL', 'coral springs': 'FL', 'miami gardens': 'FL',
  clearwater: 'FL', 'west palm beach': 'FL', 'pompano beach': 'FL', lakeland: 'FL',
  davie: 'FL', 'miami beach': 'FL', 'boca raton': 'FL', deltona: 'FL',
  'palm bay': 'FL', 'fort myers': 'FL', lauderhill: 'FL', daytona: 'FL',
  'port st. lucie': 'FL', 'port saint lucie': 'FL', sunrise: 'FL', pensacola: 'FL',
  // ── GEORGIA ──
  atlanta: 'GA', savannah: 'GA', columbus: 'GA', 'sandy springs': 'GA',
  macon: 'GA', roswell: 'GA', albany: 'GA', 'johns creek': 'GA',
  'warner robins': 'GA', alpharetta: 'GA', marietta: 'GA',
  // ── HAWAII ──
  honolulu: 'HI', 'east honolulu': 'HI', 'pearl city': 'HI', hilo: 'HI', kailua: 'HI',
  // ── IDAHO ──
  boise: 'ID', nampa: 'ID', meridian: 'ID', 'idaho falls': 'ID', pocatello: 'ID',
  // ── ILLINOIS ──
  chicago: 'IL', aurora: 'IL', joliet: 'IL', naperville: 'IL', rockford: 'IL',
  springfield: 'IL', elgin: 'IL', peoria: 'IL', champaign: 'IL', waukegan: 'IL',
  'morton grove': 'IL', 'schaumburg': 'IL', evanston: 'IL', decatur: 'IL',
  // ── INDIANA ──
  indianapolis: 'IN', 'fort wayne': 'IN', evansville: 'IN', 'south bend': 'IN',
  carmel: 'IN', hammond: 'IN', bloomington: 'IN', gary: 'IN', fishers: 'IN',
  // ── IOWA ──
  'des moines': 'IA', 'cedar rapids': 'IA', davenport: 'IA', 'sioux city': 'IA',
  'iowa city': 'IA', waterloo: 'IA', ames: 'IA',
  // ── KANSAS ──
  wichita: 'KS', 'overland park': 'KS', 'kansas city ks': 'KS', olathe: 'KS', topeka: 'KS',
  // ── KENTUCKY ──
  louisville: 'KY', lexington: 'KY', 'bowling green': 'KY', owensboro: 'KY',
  // ── LOUISIANA ──
  'new orleans': 'LA', 'baton rouge': 'LA', shreveport: 'LA', metairie: 'LA',
  lafayette: 'LA', 'lake charles': 'LA',
  // ── MAINE ──
  portland: 'ME', lewiston: 'ME', bangor: 'ME',
  // ── MARYLAND ──
  baltimore: 'MD', 'columbia md': 'MD', germantown: 'MD', 'silver spring': 'MD',
  waldorf: 'MD', 'frederick md': 'MD', 'glen burnie': 'MD', gaithersburg: 'MD',
  // ── MASSACHUSETTS ──
  boston: 'MA', worcester: 'MA', springfield: 'MA', cambridge: 'MA',
  lowell: 'MA', brockton: 'MA', 'new bedford': 'MA', quincy: 'MA',
  // ── MICHIGAN ──
  detroit: 'MI', 'grand rapids': 'MI', warren: 'MI', 'sterling heights': 'MI',
  'ann arbor': 'MI', lansing: 'MI', flint: 'MI', dearborn: 'MI',
  'troy mi': 'MI', livonia: 'MI', westland: 'MI', kalamazoo: 'MI',
  // ── MINNESOTA ──
  minneapolis: 'MN', 'saint paul': 'MN', 'st paul': 'MN', rochester: 'MN',
  duluth: 'MN', bloomington: 'MN', 'brooklyn park': 'MN', plymouth: 'MN',
  // ── MISSISSIPPI ──
  jackson: 'MS', gulfport: 'MS', southaven: 'MS', hattiesburg: 'MS',
  // ── MISSOURI ──
  'kansas city': 'MO', 'st. louis': 'MO', 'saint louis': 'MO', springfield: 'MO',
  independence: 'MO', columbia: 'MO',
  // ── MONTANA ──
  billings: 'MT', missoula: 'MT', 'great falls': 'MT', bozeman: 'MT',
  // ── NEBRASKA ──
  omaha: 'NE', lincoln: 'NE', 'bellevue ne': 'NE',
  // ── NEVADA ──
  'las vegas': 'NV', henderson: 'NV', reno: 'NV', 'north las vegas': 'NV', sparks: 'NV',
  // ── NEW HAMPSHIRE ──
  manchester: 'NH', nashua: 'NH', concord: 'NH',
  // ── NEW JERSEY ──
  newark: 'NJ', 'jersey city': 'NJ', paterson: 'NJ', elizabeth: 'NJ',
  trenton: 'NJ', clifton: 'NJ', camden: 'NJ', 'toms river': 'NJ',
  // ── NEW MEXICO ──
  albuquerque: 'NM', 'santa fe': 'NM', 'las cruces': 'NM', 'rio rancho': 'NM',
  // ── NEW YORK ──
  'new york': 'NY', 'new york city': 'NY', nyc: 'NY', brooklyn: 'NY',
  queens: 'NY', bronx: 'NY', buffalo: 'NY', rochester: 'NY',
  yonkers: 'NY', syracuse: 'NY', albany: 'NY', 'new rochelle': 'NY',
  manhattan: 'NY', 'staten island': 'NY', 'long island': 'NY',
  // ── NORTH CAROLINA ──
  charlotte: 'NC', raleigh: 'NC', greensboro: 'NC', durham: 'NC',
  'winston-salem': 'NC', 'winston salem': 'NC', fayetteville: 'NC', cary: 'NC',
  wilmington: 'NC', 'high point': 'NC', concord: 'NC',
  // ── NORTH DAKOTA ──
  fargo: 'ND', bismarck: 'ND', 'grand forks': 'ND', minot: 'ND',
  // ── OHIO ──
  columbus: 'OH', cleveland: 'OH', cincinnati: 'OH', toledo: 'OH',
  akron: 'OH', dayton: 'OH', parma: 'OH', youngstown: 'OH',
  // ── OKLAHOMA ──
  'oklahoma city': 'OK', tulsa: 'OK', norman: 'OK', 'broken arrow': 'OK',
  // ── OREGON ──
  portland: 'OR', eugene: 'OR', 'salem or': 'OR', gresham: 'OR',
  hillsboro: 'OR', beaverton: 'OR', medford: 'OR',
  // ── PENNSYLVANIA ──
  philadelphia: 'PA', pittsburgh: 'PA', allentown: 'PA', erie: 'PA',
  reading: 'PA', scranton: 'PA', 'bethlehem pa': 'PA', lancaster: 'PA',
  // ── RHODE ISLAND ──
  providence: 'RI', cranston: 'RI', warwick: 'RI',
  // ── SOUTH CAROLINA ──
  'columbia sc': 'SC', charleston: 'SC', 'north charleston': 'SC', 'mount pleasant': 'SC',
  // ── SOUTH DAKOTA ──
  'sioux falls': 'SD', 'rapid city': 'SD',
  // ── TENNESSEE ──
  nashville: 'TN', memphis: 'TN', knoxville: 'TN', chattanooga: 'TN',
  clarksville: 'TN', murfreesboro: 'TN', franklin: 'TN',
  // ── TEXAS ──
  houston: 'TX', 'san antonio': 'TX', dallas: 'TX', austin: 'TX',
  'fort worth': 'TX', 'el paso': 'TX', arlington: 'TX', 'corpus christi': 'TX',
  plano: 'TX', laredo: 'TX', lubbock: 'TX', garland: 'TX', irving: 'TX',
  amarillo: 'TX', 'grand prairie': 'TX', brownsville: 'TX', mckinney: 'TX',
  frisco: 'TX', pasadena: 'TX', mesquite: 'TX', killeen: 'TX',
  mcallen: 'TX', denton: 'TX', waco: 'TX', carrollton: 'TX',
  midland: 'TX', lewisville: 'TX', abilene: 'TX', beaumont: 'TX',
  // ── UTAH ──
  'salt lake city': 'UT', 'west valley city': 'UT', provo: 'UT', 'west jordan': 'UT',
  orem: 'UT', sandy: 'UT', ogden: 'UT', 'st. george': 'UT', 'saint george': 'UT',
  // ── VERMONT ──
  burlington: 'VT',
  // ── VIRGINIA ──
  'virginia beach': 'VA', norfolk: 'VA', chesapeake: 'VA', richmond: 'VA',
  'newport news': 'VA', alexandria: 'VA', hampton: 'VA', roanoke: 'VA',
  // ── WASHINGTON ──
  seattle: 'WA', spokane: 'WA', tacoma: 'WA', vancouver: 'WA',
  bellevue: 'WA', kent: 'WA', renton: 'WA', kirkland: 'WA', redmond: 'WA',
  // ── WEST VIRGINIA ──
  'charleston wv': 'WV', huntington: 'WV',
  // ── WISCONSIN ──
  milwaukee: 'WI', madison: 'WI', 'green bay': 'WI', kenosha: 'WI', racine: 'WI',
  // ── WYOMING ──
  cheyenne: 'WY', casper: 'WY',

  // ════════════════════════════════════════════════════════════════════════
  // CANADA
  // ════════════════════════════════════════════════════════════════════════
  // ── ONTARIO ──
  toronto: 'ON', mississauga: 'ON', brampton: 'ON', hamilton: 'ON', london: 'ON',
  ottawa: 'ON', kingston: 'ON', windsor: 'ON', markham: 'ON', vaughan: 'ON',
  oakville: 'ON', burlington: 'ON', oshawa: 'ON', barrie: 'ON', milton: 'ON',
  ajax: 'ON', whitby: 'ON', pickering: 'ON', aurora: 'ON', newmarket: 'ON',
  'richmond hill': 'ON', 'thunder bay': 'ON', waterloo: 'ON', 'kitchener': 'ON',
  cambridge: 'ON', brantford: 'ON', sudbury: 'ON', guelph: 'ON',
  'st. catharines': 'ON', 'saint catharines': 'ON', belleville: 'ON', sarnia: 'ON',
  sault: 'ON', cornwall: 'ON', peterborough: 'ON',
  // ── BRITISH COLUMBIA ──
  vancouver: 'BC', surrey: 'BC', burnaby: 'BC', kelowna: 'BC', abbotsford: 'BC',
  coquitlam: 'BC', langley: 'BC', victoria: 'BC', delta: 'BC', nanaimo: 'BC',
  kamloops: 'BC', chilliwack: 'BC', 'prince george': 'BC', 'maple ridge': 'BC',
  'new westminster': 'BC', 'north vancouver': 'BC', 'west vancouver': 'BC',
  // ── ALBERTA ──
  calgary: 'AB', edmonton: 'AB', lethbridge: 'AB', 'red deer': 'AB', airdrie: 'AB',
  'st. albert': 'AB', 'saint albert': 'AB', sherwood: 'AB', 'grande prairie': 'AB',
  'medicine hat': 'AB', 'fort mcmurray': 'AB', okotoks: 'AB', 'spruce grove': 'AB',
  // ── MANITOBA ──
  winnipeg: 'MB', brandon: 'MB', steinbach: 'MB', thompson: 'MB',
  // ── SASKATCHEWAN ──
  saskatoon: 'SK', regina: 'SK', 'prince albert': 'SK', 'moose jaw': 'SK',
  // ── QUEBEC ──
  montreal: 'QC', laval: 'QC', 'quebec city': 'QC', gatineau: 'QC', sherbrooke: 'QC',
  longueuil: 'QC', saguenay: 'QC', levis: 'QC', 'trois-rivieres': 'QC', 'trois rivieres': 'QC',
  // ── NOVA SCOTIA ──
  halifax: 'NS', dartmouth: 'NS', truro: 'NS',
  // ── NEW BRUNSWICK ──
  moncton: 'NB', 'saint john': 'NB', 'st. john': 'NB', fredericton: 'NB',
  // ── NEWFOUNDLAND ──
  "st. john's": 'NL', 'saint johns': 'NL', "corner brook": 'NL',
  // ── PRINCE EDWARD ISLAND ──
  charlottetown: 'PE', summerside: 'PE',
  // ── NORTHWEST TERRITORIES ──
  yellowknife: 'NT',
  // ── YUKON ──
  whitehorse: 'YT',
  // ── NUNAVUT ──
  iqaluit: 'NU',
};

function resolveStateOrProvince(city, detectedState) {
  // If state was already detected from user input, use it directly
  if (detectedState && detectedState.trim()) return detectedState.trim().toUpperCase();
  // Auto-resolve from comprehensive city map
  const key = (city || '').toLowerCase().trim();
  return CITY_STATE_MAP[key] || '';
}


function getRelevantFaqs(userQuery) {
  if (!faqsData || !Array.isArray(faqsData) || faqsData.length === 0) return '';
  if (!fuseInstance) {
    fuseInstance = new Fuse(faqsData, {
      keys: ['question', 'keywords', 'intent_name', 'category'],
      threshold: 0.5,
      includeScore: true
    });
  }
  const results = fuseInstance.search(userQuery);
  const topResults = results.slice(0, 4).map(r => `Q: ${r.item.question}\nA: ${r.item.answer}`);
  if (topResults.length > 0) {
    return "\n\nCLIENT APPROVED KNOWLEDGE BASE (Use these exact answers if relevant to the user's question. Do not invent answers if one of these matches):\n" + topResults.join('\n\n');
  }
  return '';
}

// Search properties from Supabase
async function getMatchingProperties(intent, propType, beds, maxBudget) {
  try {
    // Normalize intent to DB value
    const statusFilter = intent === 'rent' ? 'forRent' : intent === 'buy' ? 'forSale' : null;

    const buildQuery = (budgetLimit) => {
      let query = supabase
        .from('morton_grove_properties')
        .select('listing_status, home_type, address_full, price_amount, price_formatted, bedrooms, bathrooms, main_image, property_url')
        .not('main_image', 'is', null)
        .not('property_url', 'is', null)
        .limit(4);

      if (statusFilter) query = query.eq('listing_status', statusFilter);
      if (beds && beds > 0) query = query.eq('bedrooms', beds);
      if (budgetLimit && budgetLimit > 0) query = query.eq('price_amount', budgetLimit);
      if (propType) query = query.ilike('home_type', `%${propType}%`);
      
      return query;
    };

    // Try EXACT budget first
    let { data, error } = await buildQuery(maxBudget);

    // If no results, try 1.5% increased budget
    if (!data || data.length === 0) {
      const expandedBudget = maxBudget ? maxBudget + (maxBudget * 0.015) : null;
      let query = supabase
        .from('morton_grove_properties')
        .select('listing_status, home_type, address_full, price_amount, price_formatted, bedrooms, bathrooms, main_image, property_url')
        .not('main_image', 'is', null)
        .not('property_url', 'is', null)
        .limit(4);

      if (statusFilter) query = query.eq('listing_status', statusFilter);
      if (beds && beds > 0) query = query.eq('bedrooms', beds);
      if (propType) query = query.ilike('home_type', `%${propType}%`);
      if (expandedBudget && expandedBudget > 0) {
          // Find properties between exact budget and budget + 1.5%
          query = query.gt('price_amount', maxBudget).lte('price_amount', expandedBudget);
      }
      
      const res = await query;
      data = res.data;
      error = res.error;
    }

    if (error || !data || data.length === 0) {
        return "I'm sorry, but we currently don't have any properties that perfectly match your specific requirements and budget. However, our inventory updates frequently! If you are open to slightly adjusting your budget, bedroom requirements, or preferred locations, I can show you some excellent alternatives.";
    }

    const cards = data.map(p => {
      const status = p.listing_status === 'forRent' ? '🔵 For Rent' : '🟢 For Sale';
      const photos = Array.isArray(p.photos) ? p.photos : (p.images ? p.images : (p.main_image ? [p.main_image] : []));
      const allImgs = photos.join('|');
      return `[PROPERTY_CARD]
Status: ${status}
Type: ${p.home_type || 'Property'}
Address: ${p.address_full || 'Morton Grove, IL'}
Price: ${p.price_formatted || 'Contact for price'}
Beds: ${p.bedrooms || '?'} | Baths: ${p.bathrooms || '?'}
Image: ${p.main_image || (photos[0] || '')}
Images: ${allImgs}
Link: ${p.property_url}
[/PROPERTY_CARD]`;
    });

    return cards.join('\n\n');
  } catch (e) {
    console.error('Property search error:', e);
    return null;
  }
}

// In-memory cache for geocoded city center (avoids repeated API calls for same city)
const GEOCODE_CACHE = {};

// TIGHT_BOX_DEG: ~0.10 degrees ≈ 12 km radius
// Covers full city and immediate surroundings to reliably find 10-30 properties
const TIGHT_BOX_DEG = 0.10;

// Fetch city center lat/lng using OpenStreetMap Nominatim (free, no API key needed)
// Returns a bounding box (~12km radius) around the city center
async function getCityBounds(city, state) {
  const cacheKey = `${city.toLowerCase()}_${(state || '').toLowerCase()}`;
  if (GEOCODE_CACHE[cacheKey]) return GEOCODE_CACHE[cacheKey];

  try {
    const q = state ? `${city}, ${state}` : city;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'RealtyPropFlow-AI/2.0' } });
    const data = await res.json();

    if (data?.[0]?.lat && data?.[0]?.lon) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      const bounds = {
        west:  lon - TIGHT_BOX_DEG,
        east:  lon + TIGHT_BOX_DEG,
        south: lat - TIGHT_BOX_DEG,
        north: lat + TIGHT_BOX_DEG,
      };
      GEOCODE_CACHE[cacheKey] = bounds;
      console.log(`[Geocode] ${city}, ${state} → bounds (${TIGHT_BOX_DEG}° radius):`, bounds);
      return bounds;
    }
  } catch (e) {
    console.warn(`[Geocode] Failed for ${city}:`, e.message);
  }

  // Fallback default box (Chicago area)
  return { west: -87.85, east: -87.70, south: 41.98, north: 42.10 };
}

// Build a proper Zillow search URL with ?searchQueryState= (required by zillow-scraper actor)
async function buildZillowSearchUrl(city, state, intent, fullChatText = '') {
  const isRent = intent === 'rent';
  const citySlug = city.trim().toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state ? state.trim().toLowerCase().replace(/\s+/g, '-') : '';

  const bounds = await getCityBounds(city, state);

  const filterState = isRent
    ? {
        sort: { value: 'priorityscore' },
        ah: { value: true },
        isForRent: { value: true },
        isForSaleByAgent: { value: false },
        isForSaleByOwner: { value: false },
        isNewConstruction: { value: false },
        isForSaleForeclosure: { value: false },
        isComingSoon: { value: false },
        isAuction: { value: false },
        isForSale: { value: false },
        isRecentlySold: { value: false }
      }
    : {
        sort: { value: 'days' },
        ah: { value: true },
        isForSale: { value: true },
        isForRent: { value: false },
        isRecentlySold: { value: false }
      };

  if (fullChatText) {
    const maxBudget = parseBudget(fullChatText);
    if (maxBudget > 0) {
      if (isRent) {
        filterState.monthlyPayment = { max: Math.round(maxBudget * 1.5) };
        filterState.price = { max: Math.round(maxBudget * 1.5) };
      } else {
        filterState.price = { max: Math.round(maxBudget * 1.35) };
      }
    }

    // Property Type Filters — strictly parse from confirmed summary or user messages
    const summaryTypeMatch = fullChatText.match(/Property:\s*([^\n.]+)/i) || fullChatText.match(/type of home[^:]*:\s*([^\n.]+)/i);
    const userSelectedText = summaryTypeMatch ? summaryTypeMatch[1].toLowerCase() : fullChatText.toLowerCase();

    const isDetached = userSelectedText.includes('detached') || userSelectedText.includes('single family') || userSelectedText.includes('single_family') || userSelectedText.includes('family home') || userSelectedText.includes('villa');
    const isTownhouse = !isDetached && (userSelectedText.includes('townhouse') || userSelectedText.includes('townhome'));
    const isCondo = !isDetached && (userSelectedText.includes('condo') || userSelectedText.includes('apartment'));
    const isMultiFamily = !isDetached && (userSelectedText.includes('duplex') || userSelectedText.includes('multi-family') || userSelectedText.includes('multi family') || userSelectedText.includes('multi_family'));

    if (isDetached) {
      filterState.isSingleFamily = { value: true };
      filterState.isTownhouse = { value: false };
      filterState.isCondo = { value: false };
      filterState.isApartment = { value: false };
      filterState.isMultiFamily = { value: false };
      filterState.isManufactured = { value: false };
      filterState.isLotLand = { value: false };
    } else if (isTownhouse) {
      filterState.isTownhouse = { value: true };
      filterState.isSingleFamily = { value: false };
      filterState.isCondo = { value: false };
      filterState.isApartment = { value: false };
      filterState.isMultiFamily = { value: false };
    } else if (isCondo) {
      filterState.isCondo = { value: true };
      filterState.isApartment = { value: true };
      filterState.isSingleFamily = { value: false };
      filterState.isTownhouse = { value: false };
      filterState.isMultiFamily = { value: false };
    } else if (isMultiFamily) {
      filterState.isMultiFamily = { value: true };
      filterState.isSingleFamily = { value: false };
      filterState.isTownhouse = { value: false };
      filterState.isCondo = { value: false };
    }

    // Beds and Baths Filters — apply relaxed minimums for flexibility
    const bedsMatch = fullChatText.match(/Bedrooms:\s*(\d+)/i) || fullChatText.match(/(\d+)\s*beds?/i);
    if (bedsMatch && parseInt(bedsMatch[1]) > 0) {
      const requestedBeds = parseInt(bedsMatch[1]);
      // Relax beds by 1 to show more options within budget, but keep a reasonable floor
      filterState.beds = { min: Math.max(1, requestedBeds - 1) };
    }

    const bathsMatch = fullChatText.match(/Bathrooms:\s*(\d+)/i) || fullChatText.match(/(\d+)\s*baths?/i);
    if (bathsMatch && parseInt(bathsMatch[1]) > 0) {
      const requestedBaths = parseInt(bathsMatch[1]);
      // Relax baths by 1 
      filterState.baths = { min: Math.max(1, requestedBaths - 1) };
    }
  }

  const searchQueryState = {
    pagination: {},
    mapBounds: bounds,
    isMapVisible: true,
    isListVisible: true,
    filterState,
  };

  const encoded = encodeURIComponent(JSON.stringify(searchQueryState));
  const slug = stateSlug ? `${citySlug}-${stateSlug}` : citySlug;
  const path = isRent ? `${slug}/rentals` : slug;
  return `https://www.zillow.com/${path}/?searchQueryState=${encoded}`;
}


// Start Apify Zillow scraper run (non-blocking) — returns runId immediately
async function startApifyRun(city, state, intent, fullChatText = '') {
  try {
    const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();
    if (!APIFY_TOKEN) {
      console.error('[Apify] CRITICAL ERROR: APIFY_API_TOKEN is not set in environment variables!');
      return null;
    }

    const searchUrl = await buildZillowSearchUrl(city, state, intent, fullChatText);
    console.log(`[Apify] Starting run with URL: ${searchUrl.substring(0, 120)}...`);

    let runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?maxItems=20&token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrls: [{ url: searchUrl }],
          proxy: { 
            useApifyProxy: true,
            apifyProxyGroups: ['SHADER']
          }
        })
      }
    );

    let runData = await runRes.json();

    if (!runData.data?.id) {
      console.error('[Apify] API call returned success status but missing run ID. HTTP Status:', runRes.status);
      console.error('[Apify] Full Response Payload:', JSON.stringify(runData, null, 2));
      return null;
    }

    const runId = runData.data.id;
    console.log(`[Apify] Run started successfully: ${runId}`);
    return runId;
  } catch (e) {
    console.error('[Apify] Start error Exception thrown:', e.message, e.stack);
    return null;
  }
}

function generateFakeProperties(propIntent, propType, detectedCity, detectedState, propBudget, propBeds, propFeatures) {
  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  const baseBudget = propBudget > 0 ? propBudget : 700000;
  const imageSets = [
    [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'
    ]
  ];
  const generatedCards = [];
  for (let i = 1; i <= 20; i++) {
    const priceVariance = 0.8 + (Math.random() * 0.2);
    const price = baseBudget * priceVariance;
    const currentSet = imageSets[(i - 1) % imageSets.length];
    const img = currentSet[0];
    const allImgs = currentSet.join('|');
    generatedCards.push(`[PROPERTY_CARD]
Status: ${propIntent === 'rent' ? '🔵 For Rent' : '🟢 For Sale'}
Type: ${propType || 'Family Home'}
Address: ${i * 10 + 15} Demo Street, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(price)}
Beds: ${propBeds || 4} | Baths: ${Math.max(1, (propBeds || 4) - 1)}
Features: Includes ${propFeatures || 'Beautiful property with modern finishes'}
Image: ${img}
Images: ${allImgs}
Link: #demo-property-${i}
[/PROPERTY_CARD]`);
  }
  return generatedCards.join('\n\n');
}


async function liveScrapeWebsite(url) {
  if (!url) return '';
  try {
    let targetUrl = url.trim();
    if (!targetUrl.endsWith('/')) targetUrl += '/';
    
    const items = [];
    const baseUrl = new URL(targetUrl).origin;
    const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

    const resolveImg = (img) => {
      if (!img) return '';
      if (img.startsWith('http')) return img;
      if (img.startsWith('//')) return 'https:' + img;
      if (img.startsWith('/')) return baseUrl + img;
      return baseDir + img;
    };

    // 1. SHOPIFY DIRECTORY CHECK
    try {
      const shopifyRes = await fetch(targetUrl + 'products.json?limit=20', { headers: { 'User-Agent': 'RealtyPropFlow-AI' }});
      if (shopifyRes.ok) {
        const shopifyData = await shopifyRes.json();
        if (shopifyData?.products?.length > 0) {
          shopifyData.products.forEach(p => {
            const title = p.title;
            const price = p.variants?.[0]?.price ? '$' + p.variants[0].price : '';
            const img = p.images?.[0]?.src || '';
            if (title) items.push({ type: 'Product', title, price, img: resolveImg(img) });
          });
        }
      }
    } catch(e) {}

    // 2. HTML SCRAPING (JSON-LD & DOM)
    if (items.length === 0) {
      const urlsToTry = [
        targetUrl + 'products.html',
        targetUrl + 'properties.html',
        targetUrl, 
        targetUrl + 'ecommerce/products.html',
        targetUrl + 'ecommerce/index.html'
      ];

      let html = '';
      let fetchedUrl = '';
      
      for (const u of urlsToTry) {
        try {
          const res = await fetch(u, { headers: { 'User-Agent': 'RealtyPropFlow-AI' }, next: { revalidate: 300 } });
          if (res.ok) {
            html = await res.text();
            fetchedUrl = u;
            // Stop if we find indicators of products/properties or if it's the root
            if (html.includes('product') || html.includes('property') || html.includes('application/ld+json')) break;
          }
        } catch(e) {}
      }

      if (html) {
        const $ = cheerio.load(html);

        // A. JSON-LD SCHEMA (Universal for WP, Wix, standard SEO)
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const jsonData = JSON.parse($(el).html());
            const processLd = (obj) => {
              if (!obj) return;
              if (obj['@type'] === 'Product' || obj['@type'] === 'RealEstateListing' || obj['@type'] === 'Offer') {
                const title = obj.name || obj.title || '';
                const price = obj.offers?.price ? (obj.offers?.priceCurrency || '$') + obj.offers.price : '';
                let img = '';
                if (typeof obj.image === 'string') img = obj.image;
                else if (Array.isArray(obj.image)) img = obj.image[0];
                else if (obj.image?.url) img = obj.image.url;
                
                if (title && !items.find(item => item.title === title)) {
                  items.push({ type: obj['@type'], title, price, img: resolveImg(img) });
                }
              }
            };
            if (Array.isArray(jsonData)) jsonData.forEach(processLd);
            else if (jsonData['@graph']) jsonData['@graph'].forEach(processLd);
            else processLd(jsonData);
          } catch(e) {}
        });

        // B. CUSTOM FALLBACKS (For our demo & generic classes)
        if (items.length === 0) {
          // Property Cards
          $('.property-card').each((i, el) => {
            const title = $(el).find('.property-title').text().trim();
            const price = $(el).find('.property-price').text().trim();
            const img = resolveImg($(el).find('.property-img').attr('src'));
            const specs = $(el).find('.property-specs').text().replace(/\s+/g, ' ').trim();
            if (title && !items.find(item => item.title === title)) items.push({ type: 'Property', title, price, img, specs });
          });

          // Product Cards
          $('.product-card').each((i, el) => {
            const title = $(el).find('.product-name').text().trim();
            const price = $(el).find('.product-price').text().trim();
            const img = resolveImg($(el).find('.product-img').attr('src'));
            if (title && !items.find(item => item.title === title)) items.push({ type: 'Product', title, price, img });
          });
        }
      }
    }

    if (items.length === 0) return '';

    let scrapedText = "\n\nLIVE WEBSITE INVENTORY (Use these to recommend to users. MUST include markdown images `![title](img_url)` when recommending an item):\n";
    items.slice(0, 20).forEach(item => {
      scrapedText += `- **${item.title}** | Price: ${item.price} | ImageURL: ${item.img} ${item.specs ? '| Details: ' + item.specs : ''}\n`;
    });

    return scrapedText;
  } catch (error) {
    console.error("Universal Scraping error:", error);
    return '';
  }
}

async function getRelevantKnowledge(userQuery, botId) {
  if (!botId) return '';
  try {
    const { data } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('bot_id', botId)
      .textSearch('content', userQuery.split(' ').slice(0, 5).join(' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);

    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from('knowledge_base')
        .select('content')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(3);
      return fallback ? fallback.map(d => d.content).join('\n---\n') : '';
    }
    return data.map(d => d.content).join('\n---\n');
  } catch (e) {
    return '';
  }
}

// High-quality interior/exterior photo sets to supplement properties that only have a single photo
const SUPPLEMENT_PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', // Living Room
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80', // Kitchen
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80', // Bedroom
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80'  // Bathroom
  ],
  [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80',
    'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=800&q=80'
  ],
  [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80'
  ]
];

// 🏡 Fetch listings from city_property_data (Apify real data) & properties table
async function fetchCityPropertyData(botId, targetCity, intent = 'buy') {
  try {
    const cleanCity = (targetCity || '').split(',')[0].trim();
    const isRentIntent = intent === 'rent';
    let cityQuery = supabase.from('city_property_data').select('city, properties');
    if (cleanCity) cityQuery = cityQuery.ilike('city', `%${cleanCity}%`);
    const { data: cityRows, error: cityError } = await cityQuery.limit(5);

    console.log(`fetchCityPropertyData: city_property_data query. CleanCity: "${cleanCity}". Intent: "${intent}". Rows: ${cityRows?.length || 0}. Error: ${cityError?.message || 'none'}`);

    // Flatten all properties from matched rows
    let allProperties = [];
    if (!cityError && cityRows && cityRows.length > 0) {
      cityRows.forEach(row => {
        if (row.properties && Array.isArray(row.properties)) {
          allProperties = allProperties.concat(row.properties);
        }
      });
    }

    // Also check properties table (same city) if we don't have enough
    if (allProperties.length < 4) {
      const { data: tableProps } = await supabase
        .from('properties')
        .select('*')
        .ilike('city', `%${cleanCity}%`)
        .limit(10);
      if (tableProps && tableProps.length > 0) {
        allProperties = allProperties.concat(tableProps);
      }
    }

    // City not in DB → return '' so caller triggers live Apify search
    if (allProperties.length === 0) {
      console.log(`fetchCityPropertyData: No data found for city="${cleanCity}" — caller will trigger live Apify.`);
      return '';
    }

    let filteredData = allProperties;
    if (cleanCity) {
      const strictCity = filteredData.filter(item =>
        String(item.city || '').toLowerCase().includes(cleanCity.toLowerCase())
      );
      if (strictCity.length > 0) filteredData = strictCity;
    }

    // ── INTENT FILTER: rent vs buy ──────────────────────────────────────────
    // Filter by listing intent so rent searches don't show sale properties and vice versa
    if (isRentIntent) {
      const rentOnly = filteredData.filter(item => {
        const status = String(item.listing_status || item.status || '').toLowerCase();
        const priceStr = String(item.price || '').toLowerCase();
        return status.includes('rent') || priceStr.includes('/mo') || priceStr.includes('per month');
      });
      if (rentOnly.length < 2) {
        // DB has no rent listings for this city → let Apify run live rent search
        console.log(`fetchCityPropertyData: No rent listings found for city="${cleanCity}" — falling back to live Apify rent search.`);
        return '';
      }
      filteredData = rentOnly;
    } else {
      // Buy intent: exclude obvious rent-only properties
      const saleOnly = filteredData.filter(item => {
        const status = String(item.listing_status || item.status || '').toLowerCase();
        const priceStr = String(item.price || '').toLowerCase();
        return !status.includes('rent') && !priceStr.includes('/mo') && !priceStr.includes('per month');
      });
      // Only apply strict filter if we have enough results (don't leave user with nothing)
      if (saleOnly.length >= 2) filteredData = saleOnly;
    }

    console.log(`fetchCityPropertyData: Passing ${Math.min(filteredData.length, 8)} real properties to AI (intent=${intent}).`);

    let section = `\n\nAVAILABLE PROPERTIES FROM DATABASE:\n`;
    let cards = [];

    filteredData.slice(0, 8).forEach((l, i) => {
      const addr = `${l.address || ''}, ${l.city || ''}, ${l.province || ''}`.replace(/^, | , /g, '').trim();
      const price = l.price || l.priceDisplay || 'Contact for Price';
      const beds = l.bedrooms || l.beds || '3';
      const baths = l.bathrooms || l.baths || '2';
      const type = l.propertyType || l.property_type || l.homeType || l.type || 'Single Family Home';

      const isRealImg = (u) => u && typeof u === 'string' && !u.includes('maps.googleapis.com') && !u.includes('staticmap');

      // Comprehensive photo extraction across all Apify/Zillow/MLS formats
      let rawPhotos = [];
      if (Array.isArray(l.images) && l.images.length > 0) {
        rawPhotos = l.images;
      } else if (Array.isArray(l.photos) && l.photos.length > 0) {
        rawPhotos = l.photos.map(p => (typeof p === 'string' ? p : p.url)).filter(Boolean);
      } else if (Array.isArray(l.carouselPhotos) && l.carouselPhotos.length > 0) {
        rawPhotos = l.carouselPhotos.map(p => (typeof p === 'string' ? p : p.url)).filter(Boolean);
      } else if (Array.isArray(l.responsivePhotos) && l.responsivePhotos.length > 0) {
        rawPhotos = l.responsivePhotos.map(p => (typeof p === 'string' ? p : p.url)).filter(Boolean);
      } else if (l.image_url) {
        rawPhotos = [l.image_url];
      } else if (l.imgSrc) {
        rawPhotos = [l.imgSrc];
      } else if (l.mainImage) {
        rawPhotos = [l.mainImage];
      }

      let imgArr = rawPhotos.filter(isRealImg);

      // If property only has 1 main exterior photo, supplement with rich interior photos so users see multiple photos
      if (imgArr.length < 2) {
        const supplement = SUPPLEMENT_PHOTO_SETS[i % SUPPLEMENT_PHOTO_SETS.length];
        imgArr = imgArr.length > 0 ? [imgArr[0], ...supplement] : supplement;
      }

      const mainImg = imgArr[0] || '';
      const allImgs = imgArr.slice(0, 8).join('|');
      const url = l.url || l.propertyUrl || l.detailUrl || (l.zpid ? `https://www.zillow.com/homedetails/${l.zpid}_zpid/` : '#');

      const status = l.listing_status || (l.rentPrice || String(price).includes('/mo') ? '🔵 For Rent' : '🟢 For Sale');

      cards.push(`[PROPERTY_CARD]
Status: ${status}
Type: ${type}
Address: ${addr}
Price: ${price}
Beds: ${beds} | Baths: ${baths}
Image: ${mainImg}
Images: ${allImgs}
Link: ${url}
[/PROPERTY_CARD]`);
    });

    section += cards.join('\n\n');
    section += `\n\nCRITICAL INSTRUCTION: There are properties available from the database.
You MUST show EXACTLY 4 properties in your immediate response. Do NOT show all of them at once.
If you don't have exact matches for their budget/bedrooms/bathrooms, PRIORITIZE THEIR BUDGET. Show properties within ±20% of their budget even if the bedrooms or bathrooms are higher or lower. Explicitly explain the tradeoff to the user (e.g., 'I couldn't find a 5 bed 4 bath, but here is a 4 bed 3 bath well within your budget').
CRITICAL: You MUST output the properties EXACTLY as they appear above using the raw [PROPERTY_CARD] and [/PROPERTY_CARD] tags. Do NOT format them as standard text or markdown. Just copy the tags exactly.

After showing the properties, you MUST include these two buttons:
[BUTTON: Show more properties]
[BUTTON: I like one of these properties!]

If the user clicks/asks to "Show more properties", show the NEXT 2 properties using the raw tags and show the buttons again. Keep doing this for every "show more" request.`;

    return section;
  } catch (err) {
    console.error('City property fetch error:', err);
    return '';
  }
}

// ─── Universal Budget Parser ───────────────────────────────────────────────
// Handles: 990k, 870K, 1.2m, 7M, 4 million, $1,200,000, 650000, under 800k, 500 thousand, etc.
function parseBudget(text) {
  if (!text) return 0;
  const t = text.replace(/,/g, '').toLowerCase().trim();

  // Match: 1.2m, 7m, 4 million, 1.5 million
  const mMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*(?:m|million)\b/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);

  // Match: 990k, 650k, 1.5k
  const kMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*k\b/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);

  // Match: 500 thousand
  const tMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*thousand\b/);
  if (tMatch) return Math.round(parseFloat(tMatch[1]) * 1_000);

  // Match: plain number like 1200000 or $990000
  const plainMatch = t.match(/\$?\s*([\d]{4,})/);
  if (plainMatch) return parseInt(plainMatch[1]);

  return 0;
}

// 🏡 Fetch listings from private CRM properties table with strict criteria checking
async function fetchCRMProperties(botId, fullChatText, detectedCity = '', propIntent = 'buy', propBudget = 0, propBeds = 0) {
  try {
    if (!botId) return '';

    const { data: properties, error } = await supabase
      .from('properties')
      .select('*, agents(first_name, last_name, phone)')
      .eq('bot_id', botId)
      .eq('status', 'Active');

    if (error || !properties || properties.length === 0) {
      console.log(`[fetchCRMProperties] No CRM properties found for bot=${botId}`);
      return '';
    }

    console.log(`[fetchCRMProperties] Bot has ${properties.length} active listings. Checking criteria: city="${detectedCity}", intent="${propIntent}", budget=${propBudget}, beds=${propBeds}`);

    // Criteria 1: City Match (if city requested)
    let matched = properties;
    if (detectedCity && detectedCity.trim()) {
      const cleanCity = detectedCity.toLowerCase().trim().replace(/,/g, '');
      const cityMatches = matched.filter(p => {
        const pCity = String(p.city || '').toLowerCase().trim();
        const pAddr = String(p.address || '').toLowerCase().trim();
        return pCity.includes(cleanCity) || pAddr.includes(cleanCity) || cleanCity.includes(pCity);
      });

      if (cityMatches.length > 0) {
        matched = cityMatches;
      } else {
        // No properties in this requested city in CRM -> criteria NOT met, return '' to fallback to live scrape
        console.log(`[fetchCRMProperties] 0 CRM properties matched city="${detectedCity}". Falling back to live scrape/city data.`);
        return '';
      }
    }

    // Criteria 2: Intent Match (Rent vs Buy)
    const isRent = propIntent === 'rent';
    if (isRent) {
      const rentMatches = matched.filter(p => {
        const status = String(p.status || '').toLowerCase();
        const pType = String(p.property_type || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        const isLowPrice = p.price && p.price < 25000;
        return status.includes('rent') || pType.includes('rent') || desc.includes('rent') || isLowPrice;
      });
      if (rentMatches.length > 0) {
        matched = rentMatches;
      } else {
        console.log(`[fetchCRMProperties] 0 CRM properties matched rent intent in ${detectedCity}. Falling back to live rental scrape.`);
        return '';
      }
    } else {
      // Buy intent: exclude rentals if price is under $25,000 or marked for rent
      const buyMatches = matched.filter(p => {
        const status = String(p.status || '').toLowerCase();
        const isRentTagged = status.includes('rent') || String(p.property_type || '').toLowerCase().includes('rental');
        const isRentPrice = p.price && p.price > 0 && p.price < 25000;
        return !isRentTagged && !isRentPrice;
      });
      if (buyMatches.length > 0) {
        matched = buyMatches;
      }
    }

    // Criteria 3: Budget Match (if budget specified)
    if (propBudget > 0 && matched.length > 0) {
      const maxAllowed = isRent ? propBudget * 1.5 : propBudget * 1.4;
      const minAllowed = (!isRent && propBudget >= 100000) ? propBudget * 0.4 : 0;
      const budgetMatches = matched.filter(p => {
        if (!p.price || p.price === 0) return true; // Keep "contact for price"
        return p.price <= maxAllowed && p.price >= minAllowed;
      });
      if (budgetMatches.length > 0) {
        matched = budgetMatches;
      }
    }

    // Criteria 4: Bedroom Match (if beds specified)
    if (propBeds > 0 && matched.length > 0) {
      const bedMatches = matched.filter(p => {
        if (!p.bedrooms) return true;
        return Number(p.bedrooms) >= Math.max(1, propBeds - 1);
      });
      if (bedMatches.length > 0) {
        matched = bedMatches;
      }
    }

    if (matched.length === 0) {
      console.log(`[fetchCRMProperties] CRM criteria check yielded 0 matches. Falling back to live scrape.`);
      return '';
    }

    console.log(`[fetchCRMProperties] Found ${matched.length} matching CRM properties for user! Showing from website.`);

    let section = `\n\nAVAILABLE PROPERTIES FROM DATABASE:\n`;
    let cards = [];

    matched.slice(0, 8).forEach((p, i) => {
      const price = p.price ? `$${Number(p.price).toLocaleString()}${isRent ? '/mo' : ''}` : 'Contact for Price';
      const isRealImg = (u) => u && typeof u === 'string' && !u.includes('maps.googleapis.com') && !u.includes('staticmap');
      const photosArr = (Array.isArray(p.photos) ? p.photos : (p.photos ? [p.photos] : (p.image_url ? [p.image_url] : []))).filter(isRealImg);
      const img = photosArr[0] || '';
      const allImgs = photosArr.join('|');
      const address = `${p.address}${p.city ? ', ' + p.city : ''}${p.state ? ', ' + p.state : ''}`;
      const status = isRent ? '🔵 For Rent' : '🟢 For Sale';

      cards.push(`[PROPERTY_CARD]
Status: ${status}
Type: ${p.property_type || 'Property'}
Address: ${address}
Price: ${price}
Beds: ${p.bedrooms || '?'} | Baths: ${p.bathrooms || '?'}
Image: ${img}
Images: ${allImgs}
Link: ${p.url || '#'}
[/PROPERTY_CARD]`);
    });

    section += cards.join('\n\n');
    section += `\n\nCRITICAL INSTRUCTION: There are properties available from the client's website inventory.
You MUST show EXACTLY 4 properties in your immediate response. Do NOT show all of them at once.
If you don't have exact matches for their budget/bedrooms/bathrooms, PRIORITIZE THEIR BUDGET. Show properties within ±20% of their budget even if the bedrooms or bathrooms are higher or lower. Explicitly explain the tradeoff to the user (e.g., 'I couldn't find a 5 bed 4 bath, but here is a 4 bed 3 bath well within your budget').
CRITICAL: You MUST output the properties EXACTLY as they appear above using the raw [PROPERTY_CARD] and [/PROPERTY_CARD] tags. Do NOT format them as standard text or markdown. Just copy the tags exactly.

After showing the properties, you MUST include these two buttons:
[BUTTON: Show more properties]
[BUTTON: I like one of these properties!]

If the user clicks/asks to "Show more properties", show the NEXT 2 properties using the raw tags and show the buttons again. Keep doing this for every "show more" request.`;

    return section;
  } catch (err) {
    console.error('CRM property fetch error:', err);
    return '';
  }
}

export async function POST(req) {
  try {
    const reqBody = await req.json();
    const { messages, session_id, bot_id, plan: rawPlan = 'premium', is_demo } = reqBody;

    // All real bots (non-demo) are premium and search real properties
    const isDemoBot = bot_id === 'demo-real-estate';
    const plan = isDemoBot ? rawPlan : 'premium';

    let botName = 'AI Assistant';
    let websiteUrl = 'this website';
    let calendlyLink = '';
    let liveInventory = '';
    let isRealEstateEarly = false;
    let isEcommerceEarly = false;

    // Extract user query and full chat history
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage?.parts?.[0]?.text || '';
    const fullChatText = messages.map(m => m.parts?.[0]?.text || '').join(' ');

    if (bot_id) {
      const { data: bot } = await supabase.from('bots').select('*').eq('id', bot_id).single();
      if (bot) {
        botName = bot.name;
        websiteUrl = bot.website_url;
        calendlyLink = bot.calendly_link || '';
        
        // Detect industry from DB first, then fallback to name detection
        const botIndustryEarly = bot.industry || '';
        const botNameLower = bot.name.toLowerCase();
        // Added 'real state' to cover user typos in bot naming
        isRealEstateEarly = botIndustryEarly === 'Real Estate' || botNameLower.includes('real estate') || botNameLower.includes('real state') || botNameLower.includes('realty') || botNameLower.includes('property') || botNameLower.includes('luxe');
        isEcommerceEarly = botIndustryEarly === 'E-Commerce' || botNameLower.includes('shop') || botNameLower.includes('store') || botNameLower.includes('fashion') || botNameLower.includes('ecommerce');

        if (bot.status !== 'Active') {
          return Response.json({ reply: "This chatbot is currently inactive. Please contact the website owner." });
        }

        const { data: subscription } = await supabase
          .from('users_subscription')
          .select('status, trial_ends_at')
          .eq('user_id', bot.user_id)
          .single();

        if (subscription && subscription.trial_ends_at) {
          const trialEnd = new Date(subscription.trial_ends_at);
          const now = new Date();
          
          if (subscription.status === 'Trialing' && now > trialEnd) {
            // Trial has expired, auto-update to Inactive to prevent further chats
            await supabase
              .from('users_subscription')
              .update({ status: 'Inactive' })
              .eq('user_id', bot.user_id);
              
            return Response.json({ reply: "This chatbot is currently paused. Please contact the website owner directly." });
          }
          
          if (subscription.status === 'Inactive') {
             return Response.json({ reply: "This chatbot is currently paused. Please contact the website owner directly." });
          }
        }
        
        // 🏡 Real Estate: Scrape website and fetch from city DB (CONCURRENTLY)
        if (isRealEstateEarly) {
          const fetchWebsite = websiteUrl ? Promise.race([
            liveScrapeWebsite(websiteUrl),
            new Promise(resolve => setTimeout(() => resolve(''), 3500))
          ]) : Promise.resolve('');
          
          const fetchCRM = fetchCRMProperties(bot_id, fullChatText);

          const [websiteData, crmListings] = await Promise.all([fetchWebsite, fetchCRM]);

          if (websiteData) {
            liveInventory = `\n\n--- PRIMARY WEBSITE INVENTORY ---\n${websiteData}`;
          }
          if (crmListings) {
            liveInventory = (liveInventory || '') + crmListings;
          }
        }
        // 🛒 E-commerce: Use live scraping only (with timeout)
        if (!liveInventory && websiteUrl) {
          const scrapeWithTimeout = Promise.race([
            liveScrapeWebsite(websiteUrl),
            new Promise(resolve => setTimeout(() => resolve(''), 5000))
          ]);
          liveInventory = await scrapeWithTimeout;
        }
      }
    }
    // ── Demo Bot Fallback (demo-real-estate, demo-ecommerce) ───────────────
    if (bot_id && bot_id.startsWith('demo-')) {
      if (bot_id === 'demo-real-estate') {
        botName = 'Real Estate Bot';
        websiteUrl = 'https://real-state-23j6.vercel.app';
        isRealEstateEarly = true;
      } else if (bot_id === 'demo-real-estate-live') {
        botName = 'Real Estate Live Bot';
        websiteUrl = 'https://real-state-23j6.vercel.app';
        isRealEstateEarly = true;
      }
    }

    if (session_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('is_human_takeover')
        .eq('id', session_id)
        .single();

      if (session?.is_human_takeover) {
        return Response.json({ reply: null, human_takeover: true });
      }
    }
    // Run Knowledge and Profile fetches concurrently
    const fetchKnowledge = getRelevantKnowledge(userQuery, bot_id);
    const fetchProfile = (bot_id && !bot_id.startsWith('demo-')) 
      ? supabase.from('knowledge_base').select('content').eq('bot_id', bot_id).eq('source', 'Agent Profile Data').single()
      : Promise.resolve({ data: null });

    const results = await Promise.all([fetchKnowledge, fetchProfile]);
    const knowledge = results[0];
    const profileKb = results[1]?.data || null;

    // Format Agent Profile
    let agentProfileSection = '';
    if (profileKb?.content) {
      try {
        const p = JSON.parse(profileKb.content);
        const areasServed = [
          ...(p.cities_served || []),
          ...(p.neighborhoods || []),
          ...(p.communities || [])
        ];
        const areasNotServed = p.areas_not_served || [];
        agentProfileSection = `

=== AGENT IDENTITY — READ CAREFULLY ===
You represent ${p.full_name || botName}${p.title ? `, ${p.title}` : ''}${p.brokerage ? ` at ${p.brokerage}` : ''}${p.state_province ? `, based in ${p.state_province}` : ''}.
${p.years_experience ? `They have ${p.years_experience} years of experience in real estate.` : ''}
${p.specialties?.length ? `Specialties: ${p.specialties.join(', ')}.` : ''}
${p.languages?.length ? `Languages spoken: ${p.languages.join(', ')}.` : ''}

CONTACT INFO (Use this when users ask):
${p.phone ? `Phone: ${p.phone}` : ''}\n${p.email ? `Email: ${p.email}` : ''}\n${p.office_address ? `Office: ${p.office_address}` : ''}\n${p.state_province ? `State/Province: ${p.state_province}` : ''}\n${p.business_hours ? `Hours: ${p.business_hours}` : ''}\n${p.booking_link ? `Booking: ${p.booking_link}` : ''}\n${p.website_url ? `Website: ${p.website_url}` : ''}
${p.facebook ? `Facebook: ${p.facebook}` : ''}\n${p.instagram ? `Instagram: ${p.instagram}` : ''}\n${p.linkedin ? `LinkedIn: ${p.linkedin}` : ''}

SERVICE AREAS (STRICTLY ENFORCE THIS):
${areasServed.length ? `I serve ONLY these areas: ${areasServed.join(', ')}.` : ''}
${p.state_province ? `Primary operating state/province: ${p.state_province}.` : ''}
${p.zip_codes?.length ? `ZIP/Postal codes: ${p.zip_codes.join(', ')}.` : ''}
${p.counties?.length ? `Counties: ${p.counties.join(', ')}.` : ''}
${p.condo_buildings?.length ? `Specialized condo buildings: ${p.condo_buildings.join(', ')}.` : ''}
${areasNotServed.length ? `
⛔ I DO NOT serve these areas: ${areasNotServed.join(', ')}. If a user asks about any of these areas, ALWAYS politely say: "I specialize in [service area], and unfortunately I don't cover [requested area]. However, I can refer you to a trusted agent in that area! Would you like me to help you with properties in my service areas instead?"` : ''}
=== END AGENT IDENTITY ===
`;
      } catch {}
    }

    // Build dynamic prompt based on bot industry
    // Reuse bot data already fetched above (avoid duplicate DB call)
    let botData = null;
    if (bot_id === 'demo-real-estate') {
      botData = { name: 'Real Estate Bot', industry: 'Real Estate' };
    } else if (bot_id === 'demo-real-estate-live') {
      botData = { name: 'Real Estate Live Bot', industry: 'Real Estate' };
    } else if (bot_id) {
      // bot was already fetched at the top — reuse isRealEstateEarly/isEcommerceEarly
      botData = { name: botName, industry: isRealEstateEarly ? 'Real Estate' : isEcommerceEarly ? 'E-Commerce' : 'Custom' };
    }
    
    // Determine industry from database column
    const botIndustry = botData?.industry || 'Custom';
    const botNameL = botData?.name ? botData.name.toLowerCase() : '';
    const isEcommerce = botIndustry === 'E-Commerce' || botNameL.includes('shop') || botNameL.includes('store');
    const isRealEstate = botIndustry === 'Real Estate' || botNameL.includes('real estate') || botNameL.includes('real state') || botNameL.includes('realty') || botNameL.includes('property');
    const isGeneral = !isEcommerce && !isRealEstate;
    
    let faqContext = '';
    if (isRealEstate) {
      faqContext = getRelevantFaqs(userQuery);
    }

    // --- Property Matching: Supabase first, Apify as fallback ---
    let propertyContext = '';
    let cityEngagementContext = '';
    let apifyRunId = null;
    let isBudgetAmbiguous = false;

    if (isRealEstate) {
      const fullText = fullChatText.toLowerCase();
      const userTextOnly = messages.filter(m => m.role === 'user').map(m => m.parts?.[0]?.text || '').join(' ').toLowerCase();

      let propIntent = 'buy';
      if (userTextOnly.includes('intent: rent') || userTextOnly.includes('looking to rent') || userTextOnly.includes('want to rent') || userTextOnly.includes('for rent') || userTextOnly.includes('renting') || userTextOnly.includes('to rent') || userTextOnly.includes('rental')) {
        propIntent = 'rent';
      } else if (userTextOnly.includes('buy') || userTextOnly.includes('buying') || userTextOnly.includes('purchase') || userTextOnly.includes('family home') || userTextOnly.includes('home search')) {
        propIntent = 'buy';
      } else if (fullText.includes('looking to rent') || fullText.includes('want to rent') || fullText.includes('intent: rent')) {
        propIntent = 'rent';
      }

      // --- NEW LOGIC: Use AI structured summary as primary source of truth ---
      // Check BOTH 'model' AND 'user' roles — frontend sends confirmed summary as 'user' message
      const recentSummary = [...messages].reverse().find(m =>
        (m.role === 'model' || m.role === 'user') &&
        (m.parts?.[0]?.text?.includes('Location:') || m.parts?.[0]?.text?.includes('To summarize') || m.parts?.[0]?.text?.includes('User confirmed requirements'))
      );
      let sumCity = null, sumState = null, sumBeds = 0, sumBudget = 0, sumType = null, sumFeatures = null;
      if (recentSummary) {
        const sumText = recentSummary.parts[0].text;
        // Stop at period OR newline so searchPrompt fields don't bleed into state
        const locMatch = sumText.match(/Location:\s*([^,\n.]+)(?:[,]\s*([^\n.]+))?/i) || sumText.match(/in\s+([a-zA-Z\s]+),\s*([a-zA-Z\s]+)\b/i);
        if (locMatch && locMatch[1]) {
          sumCity = locMatch[1].trim().replace(/\[|\]/g, '');
          // Only take the state abbreviation (2-letter), strip anything after space/period
          if (locMatch[2]) sumState = locMatch[2].trim().split(/[\s.]/)[0].replace(/\[|\]/g, '').toUpperCase();
        }
        const bedsMatch = sumText.match(/Bedrooms:\s*(\d+)/i) || sumText.match(/(\d+)-bedroom/i);
        if (bedsMatch) sumBeds = parseInt(bedsMatch[1]);
        
        const budMatch = sumText.match(/Maximum budget:\s*\$?([^\n]+)/i)
          || sumText.match(/budget(?:\s+of|:)?\s*\$?([^\n]{1,30})/i);
        if (budMatch) sumBudget = parseBudget(budMatch[1]);
        
        const typeMatch = sumText.match(/Property:\s*([^\n\.]+)/i);
        if (typeMatch) sumType = typeMatch[1].replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim().toLowerCase();
        
        const featMatch = sumText.match(/Important features:\s*([^\n]+)/i);
        if (featMatch) sumFeatures = featMatch[1].trim();
      }

      // Extract property type (fallback)
      const typeMatch = fullText.match(/(apartment|condo|townhouse|house|single family|multi family)/i);
      const propType = sumType || (typeMatch ? typeMatch[1].toLowerCase() : null);
      const propFeatures = sumFeatures || 'Beautiful property with modern finishes';

      // Extract bedrooms (fallback from raw chat)
      const bedsMatch = fullText.match(/(\d)\s*(?:bed(?:room)?s?|br\b)/);
      const propBeds = sumBeds > 0 ? sumBeds : (bedsMatch ? parseInt(bedsMatch[1]) : 0);

      // ── Budget Extraction (robust) ──────────────────────────────────────────
      let propBudget = sumBudget > 0 ? sumBudget : 0;
      if (propBudget === 0) {
        // Try multiple patterns from the full raw chat text
        const budPatterns = [
          fullChatText.match(/Maximum budget:\s*\$?([^\n]{1,40})/i),
          fullChatText.match(/(?:budget|max|maximum)[^\n]{0,25}:\s*\$?([^\n]{1,40})/i),
          fullChatText.match(/\$([\d.]+\s*(?:k|m|million|thousand)\b)/i),
          fullChatText.match(/\$([\d]{3,}(?:[.,]\d+)?)/),
          fullChatText.match(/([\d.]+\s*(?:k|m|million|thousand)\b)/i),
          fullChatText.match(/([\d]{4,}(?:[.,]\d+)?)/),
        ];
        for (const m of budPatterns) {
          if (m && m[1]) {
            const parsed = parseBudget(m[1]);
            if (parsed > 0) { propBudget = parsed; break; }
          }
        }
      }

      // Ambiguity check: if buy intent and budget looks suspiciously small (< 1000), treat as ambiguous
      isBudgetAmbiguous = propBudget > 0 && propBudget < 1000 && propIntent === 'buy';
      if (isBudgetAmbiguous) propBudget = 0; // reset so we ask clarification

      // Reject year-like numbers for rent budget (e.g. 2024, 2025, 2026)
      if (propIntent === 'rent' && (propBudget > 50000 || (propBudget >= 2024 && propBudget <= 2030))) {
        propBudget = 0;
      }

      // Extract city from conversation — multiple patterns for robustness
      const stateAbbrs = 'al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|on|ab|bc|mb|nb|nl|ns|nt|nu|pe|qc|sk|yt|ontario|alberta|columbia|manitoba|brunswick|scotia|quebec|saskatchewan|texas|california|florida|york';
      const prefixPattern = new RegExp(`(?:in|near|at|for)\\s+([a-z][a-z\\s]{1,30}),?\\s*(${stateAbbrs})\\b`, 'g');
      const directPattern = new RegExp(`\\b([a-z][a-z\\s]{1,25}),\\s*(${stateAbbrs})\\b`, 'g');
      const genericCityPattern = new RegExp(`(?:in|near|at)\\s+([a-z][a-z\\s]{2,20})(?:\\s|$)`, 'g');

      const prefixMatches = [...fullText.matchAll(prefixPattern)];
      const directMatches = [...fullText.matchAll(directPattern)];
      const genericMatches = [...fullText.matchAll(genericCityPattern)];

      let detectedCity = sumCity;
      let detectedState = sumState;

      if (!detectedCity) {
        let lastMatch = null;
        if (prefixMatches.length > 0) {
          lastMatch = prefixMatches[prefixMatches.length - 1];
          detectedCity = lastMatch[1].trim().replace(/\s+/g, ' ');
          detectedState = lastMatch[2].toUpperCase();
        } else if (directMatches.length > 0) {
          lastMatch = directMatches[directMatches.length - 1];
          detectedCity = lastMatch[1].trim().replace(/\s+/g, ' ');
          detectedState = lastMatch[2].toUpperCase();
        } else if (genericMatches.length > 0) {
          detectedCity = genericMatches[genericMatches.length - 1][1].trim();
          detectedState = '';
        }
      }

      // Only trigger property search after user has provided city + budget + beds
      // AND has confirmed the summary with "yes"
      const lastUserMsg = userQuery.toLowerCase().trim();
      const hasConfirmedSummary = /(yes|yeah|correct|yep|sure|exactly|more|next|show)/i.test(lastUserMsg);
      // For demo bot: trigger if summary exists + confirmed (city is enough for fake props)
      const isDemoBot = bot_id === 'demo-real-estate';
      // For premium bots: city + confirmed summary is enough. Budget/beds are used as filters but NOT required to trigger.
      // Also allow trigger if the message itself contains 'User confirmed requirements' (from frontend searchPrompt)
      const isConfirmedSearchPrompt = messages[messages.length - 1]?.parts?.[0]?.text?.includes('User confirmed requirements');
      const hasEnoughInfo = isDemoBot
        ? (detectedCity || recentSummary) && hasConfirmedSummary
        : (propIntent && detectedCity && hasConfirmedSummary) || isConfirmedSearchPrompt;

      // DEBUG: log extracted values to Vercel logs
      console.log(`[PropertySearch] intent=${propIntent} city=${detectedCity} state=${detectedState} beds=${propBeds} budget=${propBudget} confirmed=${hasConfirmedSummary} enoughInfo=${hasEnoughInfo} lastMsg="${lastUserMsg}"`);

      if (hasEnoughInfo && hasConfirmedSummary) {
        const cityLower = (detectedCity || '').toLowerCase().trim();
        const isMortonGrove = cityLower === 'morton grove' || cityLower === '';

        let matchedProperties = null;
        // For non-demo bots, all cities go through the full priority chain below
        // For demo bot, fake properties are generated separately

        // demo-real-estate uses Fake Properties ONLY. Everything else gets REAL properties.
        const isDemoBotRequest = bot_id === 'demo-real-estate';

        if (isDemoBotRequest) {
          // Demo bot ALWAYS shows fake properties — regardless of plan setting
          matchedProperties = generateFakeProperties(propIntent, propType, detectedCity, detectedState, propBudget, propBeds, propFeatures);

          propertyContext = `\n\nAVAILABLE PROPERTIES FROM DATABASE:
${matchedProperties}

CRITICAL INSTRUCTION: There are properties available from the database.
You MUST show EXACTLY 4 properties in your immediate response. Do NOT show all of them.
If you don't have exact matches for their budget/bedrooms/bathrooms, PRIORITIZE THEIR BUDGET. Show properties within ±20% of their budget even if the bedrooms or bathrooms are higher or lower. Explicitly explain the tradeoff to the user (e.g., 'I couldn't find a 5 bed 4 bath, but here is a 4 bed 3 bath well within your budget').
CRITICAL: You MUST output the properties EXACTLY as they appear using the raw [PROPERTY_CARD] and [/PROPERTY_CARD] tags. Do NOT format them as standard text or markdown. Just copy the tags exactly.

After showing the properties, you MUST include these two buttons:
[BUTTON: Show more properties]
[BUTTON: I like one of these properties!]

If the user clicks/asks to "Show more properties", show the NEXT 2 properties using the raw tags and show the buttons again. Keep doing this for every "show more" request.`;
        } else if (plan === 'standard') {
          // Standard plan: NEVER search or show properties. Lead capture is triggered by system instruction.
          // No property context needed here.

        } else if (matchedProperties && matchedProperties.includes('[PROPERTY_CARD]')) {
          // Found in database — show immediately
          propertyContext = `\n\nAVAILABLE PROPERTIES FROM DATABASE (Show these as property cards):\n${matchedProperties}`;
        } else if (detectedCity) {
          // ============================================================
          // PRIORITY 1 & 2: Client's CRM properties + City cached data
          // ============================================================
          const crmPropertyContext = await fetchCRMProperties(bot_id, fullChatText, detectedCity, propIntent, propBudget, propBeds);
          const cachedCityContext = await fetchCityPropertyData(bot_id, detectedCity, propIntent);

          const hasCRM = crmPropertyContext && crmPropertyContext.length > 50;
          const hasCache = cachedCityContext && cachedCityContext.length > 50;

          if (hasCRM && hasCache) {
            // Both available: show client's own listings first, then supplement with city listings
            console.log(`[Route] Merging CRM properties with cached city data for bot=${bot_id}`);
            propertyContext = crmPropertyContext + "\n\nADDITIONAL AREA LISTINGS:\n" + cachedCityContext;
          } else if (hasCRM) {
            console.log(`[Route] PRIORITY 1: Found client CRM properties for bot=${bot_id}`);
            propertyContext = crmPropertyContext;
          } else if (hasCache) {
            console.log(`[Route] PRIORITY 2: Found cached city data for ${detectedCity}`);
            propertyContext = cachedCityContext;
          } else {
            // ============================================================
            // PRIORITY 3: Live Apify search (Zillow)
            // ============================================================
              const resolvedState = resolveStateOrProvince(detectedCity, detectedState);
              console.log(`[Route] PRIORITY 3: No local data — starting live Apify run for City=${detectedCity} State=${resolvedState}...`);
              apifyRunId = await startApifyRun(detectedCity, resolvedState, propIntent, fullChatText);

              if (apifyRunId) {
                const cityBtns = [
                  '[CITY_BTN: 🏫 Schools]',
                  '[CITY_BTN: 🌳 Parks]',
                  '[CITY_BTN: 🚇 Transportation]',
                  '[CITY_BTN: 🛒 Shopping & Dining]',
                  '[CITY_BTN: 🏥 Healthcare]',
                  '[CITY_BTN: 🏡 Neighborhood]',
                  '[CITY_BTN: 🏘️ Housing Market]',
                  '[CITY_BTN: 👥 Community]',
                  '[CITY_BTN: 💡 Buyer Tips]'
                ].join(' ');

                return Response.json({
                  reply: `🔍 Searching for live ${propIntent === 'rent' ? 'rental' : ''} properties in ${detectedCity}... This will take about 30 seconds. While you wait, explore what makes ${detectedCity} a great place to live! 🏙️\n\n${cityBtns}`,
                  apifyRunId,
                  intent: propIntent,
                  city: detectedCity
                });
              } else {
                // Apify failed — for real client bots, show honest message. Never show fake properties.
                console.log('[Route] Apify start failed for non-demo bot — showing no-results message');
                propertyContext = `\n\nNO PROPERTIES FOUND: Our live property search is currently unavailable for ${detectedCity}. CRITICAL INSTRUCTION: Tell the user politely that we are unable to load live listings at this moment, but that you can still help them with their search. Suggest they: 1) Ask to be connected with an agent who can provide up-to-date listings, 2) Try a nearby city or adjust their requirements, or 3) Schedule a consultation. Do NOT show any fake or demo properties. Do NOT make up addresses.`;
              }
            }
        } else if (detectedCity && isMortonGrove) {
          // Morton Grove: no DB match — try Apify
          console.log(`[Route] No DB results for Morton Grove — starting Apify run...`);
          const resolvedState = resolveStateOrProvince(detectedCity, detectedState) || 'IL';
          apifyRunId = await startApifyRun(detectedCity, resolvedState, propIntent);
          if (apifyRunId) {
            cityEngagementContext = `\n\nCITY ENGAGEMENT RULE: Searching for live listings in ${detectedCity}. While results load, show city buttons:\n[CITY_BTN: 🏠 Neighborhood] [CITY_BTN: 🏫 Schools] [CITY_BTN: 🚇 Transportation]`;
          } else {
            // Apify failed for Morton Grove — show honest message, no fake properties
            console.log('[Route] Apify failed for Morton Grove — showing no-results message');
            propertyContext = `\n\nNO PROPERTIES FOUND: Our live property search is currently unavailable for ${detectedCity}. CRITICAL INSTRUCTION: Tell the user politely that we are unable to load live listings at this moment for Morton Grove, but that you can still help them. Suggest they: 1) Ask to be connected with an agent who can provide up-to-date listings, 2) Try nearby areas like Chicago or Skokie, or 3) Schedule a consultation. Do NOT show any fake or demo properties.`;
          }
        } else if (matchedProperties) {
          // Fallback message (no city detected)
          propertyContext = `\n\n${matchedProperties}`;
        }
      }
    }

    const knowledgeSection = (knowledge || faqContext || propertyContext)
      ? `\n\nRELEVANT BUSINESS KNOWLEDGE:\n${knowledge || ''}\n${faqContext}${propertyContext}`
      : '';

    const budgetClarificationNote = isBudgetAmbiguous
      ? `\n\nIMPORTANT: The user mentioned a budget amount that is unclear. Before proceeding, you MUST politely ask: "Just to clarify — did you mean $[amount] thousand or $[amount] million?" Do NOT search for properties until the budget is confirmed.`
      : '';

    const qualifyingQuestions = isRealEstate
      ? `You are a professional real estate AI assistant representing ${botName}.
Your role is to welcome visitors, understand their real estate needs, provide helpful guidance, qualify opportunities, and connect serious prospects with the agent.

COMMUNICATION STYLE:
- Be friendly, professional, and conversational.
- Ask ONE question at a time. Never bundle multiple questions.
- Briefly acknowledge the user's input with enthusiasm before asking the next question. ⛔ CRITICAL: NEVER say "Great choice!" or "Great choice." Use "Great!", "Awesome!", or "Excellent!" instead.
- CRITICAL SPACING RULE: Keep the acknowledgment and the next question on the EXACT SAME LINE. DO NOT add newlines, paragraphs, or line breaks between them. Example: "Awesome! How many bedrooms are you looking for?"
- Provide value before requesting personal information.
- Make the visitor feel helped, not pressured.
- Keep responses concise and easy to read on mobile.
- Use emojis occasionally.

FIRST OBJECTIVE — IDENTIFY VISITOR INTENT:
If the user hasn't selected an intent yet, ask:
"Hi! 👋 Welcome. I'd be happy to help with your real estate needs. What can I help you with today?"
Then offer options: Buying a home / Home value / Selling / Renting / General question.

PATH 1 — BUYING A HOME / REAL ESTATE:
You MUST follow this exact 10-step flow strictly. Do not skip steps. Ask ONE question at a time. Do not bundle questions.
When asking a question that has predefined options, append \`[BUTTON: Option 1] [BUTTON: Option 2]\` at the very end of your message to render clickable buttons in the UI.

Step 1. Ask what type of property they are looking for:
"Are you looking for a family home, a first home, or an investment property?"
[BUTTON: Family Home] [BUTTON: Investment Property]

Step 1b. IMMEDIATELY after the user selects Family Home or Investment Property, respond with EXACTLY this trust message (replace [AGENT_NAME] with ${botName}):
"Great! 🏡 ${botName} has helped 20+ families find their perfect home in the area, so you're in great hands! I'll ask you a few quick questions to understand exactly what you're looking for."
Then immediately proceed to Step 2 question on the SAME message (no extra confirmation needed).

Step 2. Ask for preferred city/location AND province:
"Which city or area are you interested in? Please also mention the province or state (e.g., 'Milton, Ontario')."
IMPORTANT: If the user replies with ONLY the city name (e.g., "Toronto"), you MUST politely ask them which province or state it is in BEFORE moving to the next step. If they provide both the city and province/state, simply move to the next step without asking for confirmation.

Step 3a. Ask for bedrooms ONLY:
"How many bedrooms are you looking for?"

Step 3b. After getting bedrooms, ask for bathrooms ONLY:
"And how many bathrooms would you like?"

Step 4. Ask if they are a first-time buyer:
"Are you a first time buyer?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Ask about school requirements using MULTI_BUTTON tags (user can select multiple):
"Do you have any specific school requirements or preferences? (e.g. Elementary, Middle, High School)"
[MULTI_BUTTON: Elementary School] [MULTI_BUTTON: Middle School] [MULTI_BUTTON: High School]

Step 6. Ask about specific features using MULTI_BUTTON tags (user can select multiple):
"Are there any important features you're hoping for? You can select multiple options!"
[MULTI_BUTTON: Garage] [MULTI_BUTTON: Finished Basement] [MULTI_BUTTON: Swimming Pool] [MULTI_BUTTON: Backyard] [MULTI_BUTTON: New Construction]

Step 7. Ask for their budget:
"What is your budget?"

Step 8. Ask for timeline:
"Thanks! When are you planning to purchase?"
[BUTTON: Within 3 months] [BUTTON: In next 6 months] [BUTTON: Not decided]

Step 9. Ask for pre-approval status:
"Have you been pre-approved for a mortgage?"
[BUTTON: Yes] [BUTTON: No]

Step 9b. Pre-Approval Letter Upload & Agent Status:
If the user says "Yes" (they are pre-approved), respond with:
"Great! 📄 Please upload your mortgage pre-approval letter below so we can keep it on file for seller showings."
[REQUEST_PREAPPROVAL_UPLOAD]

Step 9c. Ask about real estate agent:
"Are you currently working with any other real estate agent?"
[BUTTON: Yes] [BUTTON: No]

Step 10. Summarize and Confirm:
Once all information is collected (including agent status from Step 9b), you MUST generate a summary and ask for confirmation using EXACTLY this format:

Here's what I have for your home search:
Location: [City, State]
Property: [Property Type]
Bedrooms: [Bedrooms]
Bathrooms: [Bathrooms]
Important features: [Features]
School preference: [School]
Maximum budget: [Budget]
First-time buyer: [Yes/No]
Mortgage: [Pre-approved / Not pre-approved]
Purchase timeline: [Timeline]
Currently working with an agent: [Yes/No]

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]

Step 11. Post-Confirmation Action:
${plan === 'standard' ? 
`If the user confirms the information is correct in Step 10, DO NOT search for or show any properties.
Instead, respond with EXACTLY this message:
"Perfect! I've noted all your requirements. I'll search for properties that match your needs and get back to you as soon as possible."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]` 
: 
`If the user confirms the information is correct in Step 10, follow these rules STRICTLY in order:

**RULE A — IF you see AVAILABLE PROPERTIES FROM DATABASE in the prompt:**
Immediately show ONLY those exact property cards. Do NOT add, invent, or modify any details.
CRITICAL: Even if the properties do not perfectly match every single one of the user's requirements (e.g., missing features), you MUST STILL SHOW THEM. Do not reject them. Say "Here are some properties that closely match your criteria:" and show them.
⛔ After showing properties, do NOT ask if they want to view more or capture a lead. The conversation continues naturally.

**RULE B — IF you see a CRITICAL OVERRIDE FOR STEP 11 or CRITICAL OVERRIDE FOR STEP 11 AND STEP 12 in the prompt:**
Follow it EXACTLY. This means properties are being fetched live. Show the searching message and ALL city engagement buttons (Schools, Parks, Transportation, Shopping, Dining, Healthcare, Community) with their CITY_INFO content. Do NOT show any properties yet. The properties will arrive automatically.

**RULE C — IF neither RULE A nor RULE B exist:**
Do NOT make up properties. Do NOT use general knowledge. Say exactly this:
"I'm sorry, I couldn't find any live properties matching your exact criteria right now. However, I've noted your requirements! Please provide your contact details below, and an agent will reach out to you as soon as a matching property becomes available."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]

⛔ ABSOLUTE PROHIBITION: NEVER generate, invent, or hallucinate property listings. If the data is not explicitly in this prompt, it does not exist.

If the user says "No" to the summary, or if they say "Change Search Criteria", ask them what information they would like to correct and update your understanding.

Step 12. Lead Capture:
If the user specifically asks to arrange a viewing, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]`}

DO NOT ask for their name, phone, or email manually. The [START_LEAD_CAPTURE] tag will automatically trigger the UI to collect their Name, Phone, Email, and Time Preference.

PATH 2 — RENTING A PROPERTY:
If the user is looking to rent a property, you MUST follow this exact 10-step flow strictly. Ask ONE question at a time.
Step 1. Identify Property Type:
"Are you looking to rent an apartment, condo, townhouse, or house?"
[BUTTON: Apartment] [BUTTON: Condo] [BUTTON: Townhouse] [BUTTON: House]

Step 2. Location (VERY IMPORTANT — ask this before other requirements):
"Which city or area are you looking to rent in? (Please mention city and state, e.g., 'Chicago, IL')"
IMPORTANT: If the user replies with ONLY the city name (e.g., "Chicago"), you MUST politely ask them which province or state it is in BEFORE moving to the next step. If they provide both the city and province/state, simply move to the next step without asking for confirmation.

Step 3. Bedrooms (ask ONLY bedrooms here):
"How many bedrooms do you need?"
[BUTTON: Studio] [BUTTON: 1 Bedroom] [BUTTON: 2 Bedrooms] [BUTTON: 3 Bedrooms] [BUTTON: 4+]

Step 4. Bathrooms (ask ONLY bathrooms here, separate from bedrooms):
"How many bathrooms do you need?"
[BUTTON: 1] [BUTTON: 2] [BUTTON: 3+]

Step 5. Occupants:
"Will anyone else be living with you?"

Step 6. Pets:
"Do you have any pets?"
[BUTTON: Yes] [BUTTON: No]

Step 7. Parking:
"Do you need parking?"
[BUTTON: Yes] [BUTTON: No]

Step 8. Must-have features:
"Are there any must-have features?"

Step 9. Budget:
"What is your maximum monthly budget for this rental?"

Step 10. Timeline:
"When are you thinking of moving in?"
[BUTTON: Immediately] [BUTTON: Next month] [BUTTON: In 2-3 months] [BUTTON: Not sure yet]

Step 11. Summarize and Confirm:
Once all information is collected, you MUST generate a summary and ask for confirmation using EXACTLY this format:

Here's what I have for your home search:
Location: [City, State]
Property: [Property Type]
Bedrooms: [Bedrooms]
Bathrooms: [Bathrooms]
Occupants: [Number]
Pets: [Yes/No]
Parking: [Yes/No]
Must-have features: [Features]
Maximum budget: [Budget]
Moving timeline: [Timeline]

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]

Step 12. Show Properties / Lead Capture:
CRITICAL RULE: DO NOT show properties until the user confirms the summary in Step 11.
If the user says "No", ask them what they would like to change.
${plan === 'standard' ?
`If the user confirms (says "Yes"), do NOT search for or show any properties.
Respond EXACTLY with:
"Perfect! I've noted your rental requirements. I'll find suitable properties and get back to you very soon."
Then immediately output:
[START_LEAD_CAPTURE]`
:
`If the user confirms (says "Yes"), follow these rules STRICTLY in order:

**RULE A — IF you see AVAILABLE PROPERTIES FROM DATABASE in the prompt:**
Immediately show ONLY those exact property cards. Do NOT add, invent, or modify any details.
⛔ After showing properties, do NOT ask if they want to view more or capture a lead.

**RULE B — IF you see a CRITICAL OVERRIDE FOR STEP 12 in the prompt:**
Follow it EXACTLY. Show the searching message and ALL city engagement buttons with CITY_INFO content. Do NOT show any properties yet.

**RULE C — IF neither RULE A nor RULE B exist:**
Do NOT make up properties. Say exactly this:
"I'm sorry, I couldn't find any live properties matching your exact criteria right now. However, I've noted your requirements! Please provide your contact details below, and an agent will reach out to you as soon as a matching property becomes available."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]

⛔ ABSOLUTE PROHIBITION: NEVER generate, invent, or hallucinate property listings.`}


PATH 3 — SELLING OR HOME VALUE:
If the user is looking to sell their property or wants a home valuation, you MUST follow this exact 9-step flow strictly. Ask ONE question at a time.
Step 1. Identify Seller Intent:
"I can help you understand your home's value and the selling process. Are you:"
[BUTTON: Planning to sell soon] [BUTTON: Thinking about selling in the future] [BUTTON: Just curious about my home's value] [BUTTON: Looking for general selling information]

Step 2. Understand Selling Timeline:
"When are you thinking about selling?"
[BUTTON: Immediately] [BUTTON: Within 1-3 months] [BUTTON: Within 3-6 months] [BUTTON: 6+ months] [BUTTON: Not sure yet]

Step 3. Property Address Collection:
"Got it! I can help estimate your home's current market value. May I have the full property address? (Please include the ZIP code and State if in the US, or Postal Code and Province if in Canada)."

Step 4a. Property Details - Bedrooms:
"To prepare a better estimate, can you tell me how many bedrooms your property has?"

Step 4b. Property Details - Bathrooms (Ask ONLY after getting bedrooms):
"And how many bathrooms?"

Step 4c. Property Details - Square Footage (Ask ONLY after getting bathrooms):
"What is the approximate square footage of your property?"

Step 4d. Property Details - Year Built (Ask ONLY after getting square footage):
"What year was your property built?"

Step 4e. Property Details - Upgrades (Ask ONLY after getting year built):
"Have there been any recent upgrades to your property?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Seller Motivation:
"What is the main reason you are considering selling?"
[BUTTON: Moving to another home] [BUTTON: Relocating] [BUTTON: Downsizing] [BUTTON: Investment decision] [BUTTON: Financial reasons] [BUTTON: Life changes] [BUTTON: Just exploring options]

Step 6. Understand Current Situation:
"Are you currently living in the property?"
[BUTTON: Yes, my primary home] [BUTTON: It is a rental property] [BUTTON: It is vacant] [BUTTON: Other]

Step 7. Ask About Mortgage:
"Do you currently have a mortgage on the property?"
[BUTTON: Yes] [BUTTON: No] [BUTTON: Prefer not to answer]
If yes, ask: "Approximately how much do you still owe?"

Step 8. Seller Expectations:
"What is most important to you when selling?"
[BUTTON: Highest possible price] [BUTTON: Sell quickly] [BUTTON: Easy process] [BUTTON: Finding the right buyer] [BUTTON: Minimizing stress]

Step 9. Summarize and Confirm:
Once all information is collected, you MUST generate a summary of their property details using EXACTLY this format:

Here's what I have for your property:
Property Address: [Address]
Property Details: [Bedrooms] Beds, [Bathrooms] Baths, [Square Footage] sqft
Year Built: [Year]
Recent Upgrades: [Yes/No]
Timeline to Sell: [Timeline]
Reason for Selling: [Reason]
Current Situation: [Living Situation]
Mortgage: [Yes/No - Amount if provided]
Main Priority: [Seller Expectation]

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]

Step 10. Offer Value & Capture Lead:
CRITICAL RULE: DO NOT proceed to lead capture until the user confirms the summary in Step 9.
If the user says "No", ask them what they would like to change.
If the user confirms (says "Yes"), respond EXACTLY with:
"Great! Based on this information, I can prepare a personalized home value report showing your estimated market value and recent comparable sales. Please provide your contact details below, and an agent will send it to you shortly."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]

PATH 4 — GENERAL EXPLORER:
If the user selects "General question" or is just exploring, follow this flow. Ask ONE question at a time.
Step 1. Understand Their Interest:
"That's a great place to start. Are you mainly interested in:"
[BUTTON: Understanding home prices] [BUTTON: Learning neighborhoods] [BUTTON: Seeing available properties] [BUTTON: Learning the buying process] [BUTTON: Understanding investment opportunities] [BUTTON: Just browsing]

Step 2. Educational Value:
Provide helpful information about their choice. Then ask: "Which area are you interested in?"

Step 3. Neighborhood/Needs Explorer:
"What matters most to you?"
[BUTTON: Good schools] [BUTTON: Short commute] [BUTTON: Affordable prices] [BUTTON: Luxury lifestyle] [BUTTON: Investment potential] [BUTTON: Restaurants and entertainment]

Step 4. Soft Qualification:
"To give you more useful information, are you exploring for:"
[BUTTON: Yourself] [BUTTON: Family member] [BUTTON: Investment] [BUTTON: Just curious]

Step 5. Determine Timeframe:
"How far ahead are you thinking?"
[BUTTON: Just researching] [BUTTON: Maybe within 6-12 months] [BUTTON: Within 3-6 months] [BUTTON: Within 90 days] [BUTTON: Not sure]

Step 6. Offer Useful Tools:
"Would you like access to:"
[BUTTON: Weekly market updates] [BUTTON: New property alerts] [BUTTON: Home buying checklist] [BUTTON: Neighborhood reports] [BUTTON: Home value updates]

Step 7. Capture Optional Contact:
If they want a tool or updates, politely ask for their Name and Email in the chat so you can send it to them. Do not use the [START_LEAD_CAPTURE] tag for this, unless they specifically ask to speak to an agent. Just say:
"I can send these updates to you. Would you like to receive them? If yes, please provide your Name and Email."

Step 8. Conversion Paths:
If their behavior signals they are actually a Buyer, Seller, or Investor, offer them a relevant service (e.g., personalized home search, free home estimate, or investment analysis) and if they accept, you can then output [START_LEAD_CAPTURE].

PATH 5 — INVESTING:
If the user wants to invest in real estate, you MUST follow this exact 12-step flow strictly. Ask ONE question at a time.
Step 1. Identify Investor Intent:
"Great! I can help you explore real estate investment opportunities. What type of investing are you interested in?"
[BUTTON: Rental properties] [BUTTON: Fix and flip] [BUTTON: Commercial properties] [BUTTON: Vacation rentals] [BUTTON: Land investment] [BUTTON: Real estate funds] [BUTTON: Not sure yet]

Step 2. Understand Investment Experience:
"How much experience do you have with real estate investing?"
[BUTTON: First-time investor] [BUTTON: I own 1-2 properties] [BUTTON: Experienced investor] [BUTTON: Professional investor]

Step 3. Investment Goal:
"What is your main investment goal?"
[BUTTON: Monthly cash flow] [BUTTON: Long-term appreciation] [BUTTON: Building wealth] [BUTTON: Tax benefits] [BUTTON: Diversifying investments] [BUTTON: Quick resale profit]

Step 4. Investment Location:
"Which markets are you interested in? (e.g. City, State, Neighborhood, or Open to recommendations)"

Step 5. Budget Qualification:
"What investment range are you considering?"
[BUTTON: Under $100,000] [BUTTON: $100,000-$250,000] [BUTTON: $250,000-$500,000] [BUTTON: $500,000-$1M] [BUTTON: $1M+] [BUTTON: Still exploring]

Step 6. Financing Method:
"How do you plan to purchase?"
[BUTTON: Cash purchase] [BUTTON: Mortgage financing] [BUTTON: Investment loan] [BUTTON: Partnership] [BUTTON: Not sure yet]

Step 7. Property Criteria:
"What type of property interests you?"
[BUTTON: Single-family home] [BUTTON: Multi-family property] [BUTTON: Condo] [BUTTON: Commercial property] [BUTTON: Land]
Then ask: "What matters most? (e.g., High rental income, Low maintenance, Growing area)"

Step 8 & 9. Investment Analysis:
If Rental Investor: Ask for numbers to evaluate cash flow (Purchase Price, Rent, Expenses) and offer analysis.
If Fix & Flip: Ask for numbers (Purchase price, Renovation cost, ARV) and say: "Would you like help analyzing a potential deal?"

Step 10. Risk Questions:
"What level of risk are you comfortable with?"
[BUTTON: Lower risk / stable income] [BUTTON: Moderate risk] [BUTTON: Higher return opportunities]

Step 11. Provide Investment Value:
"I can help you receive investment property alerts, rental market reports, and ROI analysis. Would you like to receive updates?"
[BUTTON: Yes, I want updates] [BUTTON: No, thank you]

Step 12. Capture Investor Lead:
If they want to receive updates or speak with an agent, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]

LEAD CONVERSION RULES:
CRITICAL: Never ask "May I have your name/phone/email" yourself. ALWAYS use [START_LEAD_CAPTURE] when they agree to proceed.

LOCATION HANDLING:
If a city is ambiguous, confirm the province/state.

CRITICAL: DO NOT HALLUCINATE LISTINGS. Only show properties from the LIVE INVENTORY provided below. If no inventory matches, say the agent will find matching options.`
      : isEcommerce
      ? `You are now in E-COMMERCE ASSISTANCE MODE.
   - When a user asks about a product, kindly ask them for any missing preferences (like Size, Color, or Budget) in a conversational way.
   - Do NOT interrogate them. Keep the conversation flowing naturally.
   - Once you have a general idea, show the best matching product ONLY from the LIVE INVENTORY provided below.
   - CRITICAL: DO NOT invent or hallucinate products. If no matching product is provided in the LIVE INVENTORY, politely state you couldn't find a match right now.`
      : `   - Ask helpful questions about their specific needs in a friendly, conversational manner.\n   - Recommend the best matching item when appropriate.`;
    
let systemInstruction = `You are an expert, professional AI Sales Consultant for ${botName}, representing the website: ${websiteUrl}.
Your ONLY goal is to help visitors and convert them into qualified leads by providing excellent assistance.

CRITICAL RULES:
1. ONE QUESTION AT A TIME: You MUST only ask ONE single question per turn. Never bundle or ask two questions in the same response. For example, if you ask for school requirements, wait for the response BEFORE asking for other features.
2. BUTTONS FOR PREDEFINED OPTIONS: Whenever you ask a question that has choices, you MUST append \`[BUTTON: Choice 1] [BUTTON: Choice 2]\` at the very end of your message. This is MANDATORY.
   - For Step 1 (Property type), you MUST append: \`[BUTTON: Family Home] [BUTTON: Investment Property]\`
   - For Step 4 (First-time buyer), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 5 (School requirements), you MUST append: \`[MULTI_BUTTON: Elementary School] [MULTI_BUTTON: Middle School] [MULTI_BUTTON: High School]\`
   - For Step 6 (Features), you MUST append: \`[BUTTON: Garage] [BUTTON: Finished Basement] [BUTTON: Swimming Pool]\`
   - For Step 8 (Timeline), you MUST append: \`[BUTTON: Within 3 months] [BUTTON: Within 6 months] [BUTTON: Not decided]\`
   - For Step 9 (Pre-approval), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 9b (Agent), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 11 (Interest), you MUST append: \`[BUTTON: Yes, I liked one] [BUTTON: No, show more]\`
   NEVER omit these buttons when asking these specific questions.

3. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
3. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
4. LEAD ASSISTANCE: 
${qualifyingQuestions}
5. SMART FALLBACKS: If the user asks for something not available, politely state: "I apologize, but we don't have exactly what you're looking for right now. However, here is the closest option:" and suggest the best match from the actual inventory.
6. RESPONSE STYLE: Keep responses short, engaging, and scannable. Use occasional emojis. Use line breaks so it looks clean on mobile. ⛔ NEVER say "Great choice!" anywhere in any response. If you want to acknowledge a good selection, use ONLY "Great!" or "Awesome!" instead.
${isRealEstate || isEcommerce ? `7. IMAGES & LINKS: When showing an item from the inventory, you MUST copy and use the EXACT markdown for Image and Link provided in the inventory data.\n8. WEBSITE LINK: You can also include the general website URL (${websiteUrl}) for more details if needed.` : `7. LINKS: Always include the website URL (${websiteUrl}) for more details.`}
${agentProfileSection}${knowledgeSection}${liveInventory}
${cityEngagementContext}${budgetClarificationNote}`;
    if (!bot_id) {
      systemInstruction = `You are an AI Sales Consultant for RealtyPropFlow AI. Your goal is to politely assist the user. Keep responses highly enthusiastic and concise.
      
CRITICAL RULES:
1. DIRECT ANSWERS: Always answer the user's question directly. NEVER just tell them to "check the pricing page" or "contact sales".
2. PRICING & PLANS: RealtyPropFlow AI has two main plans:
   - Standard Plan ($49/month): Includes AI Chatbot, 24/7 Lead Capture, Custom Knowledge Base, and Live Human Takeover. (Note: This plan captures leads but does NOT show properties).
   - Premium Plan ($79/month): Includes everything in Standard PLUS Live Property Showing, MLS/Database Integration, and advanced analytics.
3. FEATURES: 
   - Lightning Fast Setup (under 10 minutes)
   - Works on any website (WordPress, Shopify, custom, etc.)
   - Live Human Takeover: Pause the AI and talk to the prospect yourself.
   - 24/7 Lead Capture straight to the CRM dashboard.
4. LINKS: Link to https://www.realtypropflow.com/pricing for more details, or tell them they can sign up at https://www.realtypropflow.com/login.`;
    }

    // DEBUG: Log if inventory was successfully injected
    if (liveInventory) {
      console.log("✅ LIVE INVENTORY INJECTED INTO PROMPT! Length:", liveInventory.length);
    } else {
      console.log("❌ NO INVENTORY INJECTED (liveInventory is empty)");
    }

    // Setup OpenAI Client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiMessages = [
      { role: "system", content: systemInstruction }
    ];

    messages.forEach(msg => {
      // Translate Gemini history roles to OpenAI roles:
      // 'model' -> 'assistant', 'user' -> 'user'
      const role = msg.role === 'model' ? 'assistant' : 'user';
      let text = msg.parts?.[0]?.text || '';
      
      // Reconstruct buttons in history so OpenAI sees the correct assistant pattern
      if (role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0) {
        const buttonTags = msg.quickReplies.map(btn => `[BUTTON: ${btn}]`).join(' ');
        text = `${text} ${buttonTags}`;
      }
      
      openaiMessages.push({ role, content: text });
    });

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    let replyText = aiResponse.choices[0].message.content || '';
    let propertiesList = null;

    // Detect if AI triggered the properties carousel (or if it forgot but asked the question)
    const carouselMatch = replyText.match(/\[SHOW_PROPERTIES_CAROUSEL:\s*([^:]+?)\s*:\s*(\d+)[^\]]*\]/i);
    const forgotTagButAsked = replyText.includes("Did you like any of these properties");
    
    console.log("=== PROPERTIES CAROUSEL DEBUG ===");
    console.log("isRealEstateEarly:", isRealEstateEarly);
    console.log("carouselMatch:", !!carouselMatch);
    console.log("forgotTagButAsked:", forgotTagButAsked);

    if (carouselMatch || forgotTagButAsked) {
      let cityMatch = '';
      let bedsMatch = 0;
      
      if (carouselMatch) {
        cityMatch = carouselMatch[1].trim();
        bedsMatch = parseInt(carouselMatch[2]) || 0;
        // Remove tag from text
        replyText = replyText.replace(carouselMatch[0], '');
      } else {
        // Fallback: extract from chat history
        const lcChat = fullChatText.toLowerCase();
        const commonCities = ['milton', 'toronto', 'brampton', 'mississauga', 'oakville', 'hamilton', 'burlington', 'london'];
        cityMatch = commonCities.find(c => lcChat.includes(c)) || '';
        const bMatch = lcChat.match(/(\d+)\s*(?:bed|bedroom|br)/);
        bedsMatch = bMatch ? parseInt(bMatch[1]) : 0;
      }
      
      console.log("Extracted City:", cityMatch);
      console.log("Extracted Beds:", bedsMatch);

      // Fetch properties from city_property_data (real Apify data)
      let allCarouselProps = [];
      const { data: cityRows } = await supabase
        .from('city_property_data')
        .select('city, properties')
        .ilike('city', `%${cityMatch}%`)
        .limit(5);

      if (cityRows && cityRows.length > 0) {
        cityRows.forEach(row => {
          if (row.properties && Array.isArray(row.properties)) {
            allCarouselProps = allCarouselProps.concat(row.properties);
          }
        });
      }

      // ── STEP 1: Extract bedrooms & bathrooms from chat history ──────────
      const lcChat = fullChatText.toLowerCase();
      const bathsMatch = lcChat.match(/(\d+)\s*(?:bath|bathroom|baths)/);
      const bathsNeeded = bathsMatch ? parseInt(bathsMatch[1]) : 0;

      // ── STEP 2: Extract budget (supports $700k, $700,000, $4m, $4.5m etc.) ─
      // IMPORTANT: Dollar sign required for 'm' shorthand to avoid matching "3 months" as $3M
      let maxBudget = 0;
      const budgetMillionMatch = fullChatText.match(/\$([\d.]+)\s*m(?:illion)?\b/i);  // requires $
      const budgetKMatch = fullChatText.match(/\$([\d.]+)\s*k\b/i);                   // requires $
      const budgetPlainMatch = fullChatText.match(/\$\s*([\d,]{4,})/);                // $700,000 or $700000
      if (budgetMillionMatch) {
        maxBudget = Math.round(parseFloat(budgetMillionMatch[1]) * 1000000);
      } else if (budgetKMatch) {
        maxBudget = Math.round(parseFloat(budgetKMatch[1]) * 1000);
      } else if (budgetPlainMatch) {
        maxBudget = parseInt(budgetPlainMatch[1].replace(/,/g, ''));
      }
      console.log("Parsed maxBudget:", maxBudget, "| bedsMatch:", bedsMatch, "| bathsNeeded:", bathsNeeded);

      // ── STEP 3: City strict filter ──────────────────────────────────────
      if (cityMatch) {
        const strictCity = allCarouselProps.filter(p =>
          String(p.city || '').toLowerCase().includes(cityMatch.toLowerCase())
        );
        if (strictCity.length > 0) allCarouselProps = strictCity;
      }

      // ── STEP 4: Bedroom filter ──────────────────────────────────────────
      if (bedsMatch > 0) {
        const bFiltered = allCarouselProps.filter(p => parseInt(p.bedrooms) >= bedsMatch);
        if (bFiltered.length > 0) allCarouselProps = bFiltered;
      }

      // ── STEP 5: Bathroom filter ─────────────────────────────────────────
      if (bathsNeeded > 0) {
        const bathFiltered = allCarouselProps.filter(p => parseInt(p.bathrooms) >= bathsNeeded);
        if (bathFiltered.length > 0) allCarouselProps = bathFiltered;
      }

      // ── STEP 6: Smart Budget Filter (exact → +1.5% buffer → professional sorry) ──
      const NEEDS_BUDGET_FILTER = maxBudget > 10000;
      let finalProps = [];

      if (NEEDS_BUDGET_FILTER) {
        // Pass 1: Exact budget
        const exactFit = allCarouselProps.filter(item => {
          const priceNum = parseInt(String(item.price || '').replace(/[^0-9]/g, ''));
          return priceNum > 0 && priceNum <= maxBudget;
        });

        if (exactFit.length >= 1) {
          finalProps = exactFit.slice(0, 4);
          console.log("Pass 1 (exact budget) found:", finalProps.length);
        } else {
          // Pass 2: Allow up to 1.5% overflow
          const buffer = Math.round(maxBudget * 0.015);
          const slightOverBudget = allCarouselProps.filter(item => {
            const priceNum = parseInt(String(item.price || '').replace(/[^0-9]/g, ''));
            return priceNum > 0 && priceNum <= maxBudget + buffer;
          });

          if (slightOverBudget.length >= 1) {
            finalProps = slightOverBudget.slice(0, 4);
            console.log("Pass 2 (+1.5% buffer) found:", finalProps.length);
          } else {
            finalProps = [];
            console.log("No properties found within budget range, sending professional sorry.");
          }
        }
      } else {
        // No budget mentioned — just show top 4 by city + beds + baths
        finalProps = allCarouselProps.slice(0, 4);
      }

      // ── STEP 7: Normalize and return ──────────────────────────────────
      if (finalProps.length > 0) {
        propertiesList = finalProps.map(p => ({
          mls_number: p.mls_number || p.mlsNumber || '',
          price: p.price || 'Contact for Price',
          address: p.address || '',
          city: p.city || cityMatch,
          province: p.province || 'ON',
          bedrooms: p.bedrooms || 'N/A',
          bathrooms: p.bathrooms || 'N/A',
          property_type: p.property_type || p.propertyType || 'Residential',
          images: p.images && p.images.length > 0 ? p.images : [],
          image_url: (p.images && p.images[0]) || '',
          url: p.url || ''
        }));
      } else if (NEEDS_BUDGET_FILTER) {
        replyText = `I'm sorry, but we currently don't have any listings that match your criteria — ${bedsMatch > 0 ? `${bedsMatch} bedrooms` : ''}${bathsNeeded > 0 ? `, ${bathsNeeded} bathrooms` : ''} in ${cityMatch || 'your area'} within a budget of $${maxBudget.toLocaleString()}.\n\nWould you like to explore properties with a slightly higher budget, a different city, or adjusted requirements? I'd be happy to help you find the perfect match! 🏡`;
      }
      console.log("Final propertiesList length:", propertiesList?.length || 0);
    }
    console.log("=================================");

    // DB saving is now handled completely by the frontend to ensure all quick replies and local flow messages are captured.
    return Response.json({ 
      reply: replyText,
      properties: propertiesList,
      apifyRunId: typeof apifyRunId !== 'undefined' ? apifyRunId : null,
      intent: typeof propIntent !== 'undefined' ? propIntent : null
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // Handle OpenAI Quota / Rate Limit / Authentication Errors
    if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Rate limit')))) {
      return Response.json({ error: "⚠️ The AI service is currently receiving too many requests. Please wait a few seconds and try again." }, { status: 429 });
    }
    
    if (error.status === 401 || (error.message && error.message.includes('API key'))) {
      return Response.json({ error: "⚠️ Invalid AI credentials configured. Please contact the administrator." }, { status: 401 });
    }

    return Response.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}

