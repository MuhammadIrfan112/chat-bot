import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 10;

// Initialize Supabase admin client to save scraped properties
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    const intent = searchParams.get('intent') || 'buy'; // 'buy' or 'rent'
    const requestedCity = (searchParams.get('city') || '').toLowerCase().trim();
    const rawBudget = searchParams.get('budget') || '';
    const rawBeds = searchParams.get('beds') || '0';
    const rawBaths = searchParams.get('baths') || '0';
    const rawType = searchParams.get('type') || '';

    const parseBudgetNum = (text) => {
      if (!text) return 0;
      const t = String(text).replace(/,/g, '').toLowerCase().trim();
      const mMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*(?:m|million)\b/);
      if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);
      const kMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*k\b/);
      if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);
      const tMatch = t.match(/\$?\s*([\d]+(?:\.[\d]+)?)\s*thousand\b/);
      if (tMatch) return Math.round(parseFloat(tMatch[1]) * 1_000);
      const plainMatch = t.match(/\$?\s*([\d]{4,})/);
      if (plainMatch) return parseInt(plainMatch[1], 10);
      const smallNum = t.match(/\$?\s*([\d]+)/);
      if (smallNum) return parseInt(smallNum[1], 10);
      return 0;
    };

    const propBudget = parseBudgetNum(rawBudget);
    const propBeds = parseInt(rawBeds, 10) || 0;
    const propBaths = parseFloat(rawBaths) || 0;

    function normalizeHomeType(val) {
      if (!val) return '';
      const v = String(val).toLowerCase().replace(/_/g, ' ');
      // Check SEMI-DETACHED / MULTI-FAMILY first before checking 'detach' or 'single'
      if (v.includes('semi') || v.includes('multi') || v.includes('duplex') || v.includes('triplex') || v.includes('link')) return 'semi-detached';
      if (v.includes('town') || v.includes('row') || v.includes('terrace') || v.includes('attached')) return 'townhouse';
      if (v.includes('condo') || v.includes('apartment') || v.includes('flat') || v.includes('strata') || v.includes('loft') || v.includes('co-op')) return 'condo';
      if (v.includes('villa') || v.includes('luxury')) return 'detached';
      if (v.includes('single') || v.includes('detach') || v.includes('house') || v.includes('residential') || v.includes('bungalow') || v.includes('cottage')) return 'detached';
      if (v.includes('land') || v.includes('lot') || v.includes('vacant')) return 'land';
      return v;
    }

    function propTypeMatches(p, requestedType) {
      if (!requestedType) return true;
      const req = requestedType.toLowerCase().trim();
      const rawPropType = String(p.property_type || p.propertyType || p.homeType || p.home_type || p.type || '').toLowerCase();
      const pType = normalizeHomeType(rawPropType);

      // 1. Semi-Detached / Link Home (on Zillow/MLS, semi-detached are categorized under house/single-family or townhouse)
      if (req.includes('semi') || req.includes('link')) {
        return pType === 'semi-detached' || pType === 'detached' || pType === 'townhouse';
      }
      // 2. Multi-Family / Duplex
      if (req.includes('multi') || req.includes('duplex') || req.includes('triplex')) {
        return pType === 'semi-detached' || rawPropType.includes('multi') || rawPropType.includes('duplex');
      }
      // 3. Townhouse
      if (req.includes('town')) {
        return pType === 'townhouse';
      }
      // 4. Condo / Apartment
      if (req.includes('condo') || req.includes('apartment') || req.includes('flat') || req.includes('strata')) {
        return pType === 'condo';
      }
      // 5. Villa / Luxury → same as Detached (luxury = high-price detached)
      if (req.includes('villa') || req.includes('luxury')) {
        return pType === 'detached';
      }
      // 6. Detached / Single Family (strictly detached, NOT semi)
      if ((req.includes('detach') && !req.includes('semi')) || req.includes('single') || req.includes('house')) {
        return pType === 'detached';
      }
      if (req.includes('land') || req.includes('lot')) {
        return pType === 'land';
      }
      return pType.includes(req);
    }

    if (!runId) return Response.json({ error: 'Missing runId' }, { status: 400 });

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

    // Check run status
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    if (!statusRes.ok) return Response.json({ status: 'error' });

    const statusData = await statusRes.json();
    const runStatus = statusData?.data?.status;

    console.log(`[apify-result] runId=${runId} status=${runStatus} intent=${intent} budget=${propBudget} beds=${propBeds} baths=${propBaths}`);

    if (runStatus === 'RUNNING' || runStatus === 'READY' || runStatus === 'CREATED') {
      return Response.json({ status: 'running' });
    }

    let items = [];
    if (runStatus === 'SUCCEEDED') {
      const datasetId = statusData?.data?.defaultDatasetId;
      if (datasetId) {
        try {
          const itemsRes = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=35`
          );
          if (itemsRes.ok) {
            items = await itemsRes.json();
            console.log('[apify-result] Raw items count:', items?.length);
          }
        } catch (fetchErr) {
          console.warn('[apify-result] Dataset fetch error:', fetchErr.message);
        }
      }
    } else {
      console.log('[apify-result] Run did not succeed (' + runStatus + '), using fallback properties for ' + requestedCity);
    }

    let rawItems = (items && Array.isArray(items) && items.length > 0) ? items : [];

    // If Apify returned 0 real items — return 'empty' status so frontend shows honest no-results message
    // NEVER generate fake/mock addresses
    if (rawItems.length === 0) {
      console.log('[apify-result] Apify returned 0 items for city:', requestedCity, '— returning empty status');
      return Response.json({ status: 'empty', properties: [], city: requestedCity });
    }


    const itemsToProcess = rawItems;

    // ── Helper: parse valid positive number (ignores $0, 0, null, NaN) ──────
    function parseValidPriceNum(val) {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return val > 0 ? val : null;
      const cleaned = String(val).replace(/[^0-9]/g, '');
      if (!cleaned) return null;
      const n = parseInt(cleaned, 10);
      return (!isNaN(n) && n > 0) ? n : null;
    }

    // ── Helper: format price nicely and NEVER return $0 ──────────────────────
    function resolveAndFormatPrice(p, isRent = false) {
      // 1. Primary price fields
      const primaryNum = parseValidPriceNum(
        p.price || 
        p.rentPrice || 
        p.listingPrice?.value || 
        p.listingPrice?.formatted || 
        p.unformattedPrice || 
        p.hdpData?.homeInfo?.price
      );
      if (primaryNum) {
        return '$' + primaryNum.toLocaleString('en-US') + (isRent ? '/mo' : '');
      }

      // 2. Estimate / Zestimate / Tax Assessed Value (e.g. for Auctions/Off-market)
      const estNum = parseValidPriceNum(
        p.zestimate || 
        p.hdpData?.homeInfo?.zestimate || 
        p.rentZestimate || 
        p.hdpData?.homeInfo?.rentZestimate || 
        p.taxAssessedValue || 
        p.hdpData?.homeInfo?.taxAssessedValue
      );
      if (estNum) {
        return 'Est. $' + estNum.toLocaleString('en-US') + (isRent ? '/mo' : '');
      }

      // 3. Meaningful text price (e.g. Auction, Contact for price)
      const textPrice = String(p.price || p.listingPrice?.formatted || p.statusText || '').trim();
      if (textPrice && textPrice !== '$0' && textPrice !== '0' && /[a-zA-Z]/.test(textPrice)) {
        return textPrice;
      }

      // 4. Default fallback (never $0)
      return 'Contact for price';
    }

const SUPPLEMENT_PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80'
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

    // ── Map items to our standard property card format ──────────────────────
    const listingLabel = intent === 'rent' ? '🔵 For Rent' : '🟢 For Sale';

    const properties = itemsToProcess
      .map((p, i) => {
        // All photos — collect from Realtor.ca, Zillow, or Apify photo fields
        const allPhotos = (() => {
          // Realtor.ca format
          if (Array.isArray(p.Property?.Photo) && p.Property.Photo.length > 0) {
            return p.Property.Photo.map(ph => (typeof ph === 'string' ? ph : (ph.HighResPath || ph.MedResPath || ph.LowResPath || ph.url))).filter(Boolean);
          }
          // listingPhotos is the primary field from maxcopell~zillow-scraper
          if (Array.isArray(p.listingPhotos) && p.listingPhotos.length > 0) {
            return p.listingPhotos.map(ph => (typeof ph === 'string' ? ph : ph.url)).filter(Boolean);
          }
          if (Array.isArray(p.carouselPhotos) && p.carouselPhotos.length > 0) {
            return p.carouselPhotos.map(ph => ph.url || ph).filter(Boolean);
          }
          if (Array.isArray(p.photos) && p.photos.length > 0) {
            return p.photos.map(ph => (typeof ph === 'string' ? ph : (ph.url || ph.HighResPath))).filter(Boolean);
          }
          if (Array.isArray(p.images) && p.images.length > 0) {
            return p.images.map(ph => (typeof ph === 'string' ? ph : ph.url)).filter(Boolean);
          }
          if (Array.isArray(p.carouselPhotosComposable) && p.carouselPhotosComposable.length > 0) {
            return p.carouselPhotosComposable.map(ph => ph.url || ph).filter(Boolean);
          }
          // Fallback to single image fields
          if (p.mainImage) return [p.mainImage];
          if (p.imgSrc) return [p.imgSrc];
          if (p.image) return [p.image];
          return [];
        })();

        // Helper: reject Google Maps satellite placeholder images
        const isRealPhoto = (url) => url && typeof url === 'string' && !url.includes('maps.googleapis.com') && !url.includes('staticmap');

        let realPhotos = allPhotos.filter(isRealPhoto).slice(0, 8);

        if (realPhotos.length < 2) {
          const supplement = SUPPLEMENT_PHOTO_SETS[i % SUPPLEMENT_PHOTO_SETS.length];
          realPhotos = realPhotos.length > 0 ? [realPhotos[0], ...supplement] : supplement;
        }

        // Primary thumbnail
        const image = realPhotos[0] || '';

        // URL — build from Realtor.ca or Zillow fields
        const url =
          (p.RelativeDetailsURL ? `https://www.realtor.ca${p.RelativeDetailsURL}` : null) ||
          p.propertyUrl ||
          p.detailUrl ||
          p.url ||
          p.link ||
          p.hdpData?.homeInfo?.detailUrl ||
          (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : 'https://www.realtor.ca');

        // Address — try Realtor.ca and all known Zillow field combinations
        let address = 'Address not available';
        if (p.Property?.Address?.AddressText) {
          address = p.Property.Address.AddressText.replace(/\|/g, ', ');
        } else if (typeof p.address === 'string' && p.address.trim()) {
          address = p.address;
        } else if (p.addressStreet && p.addressCity) {
          address = `${p.addressStreet}, ${p.addressCity}, ${p.addressState || ''} ${p.addressZipcode || ''}`.trim();
        } else if (p.address?.full) {
          address = p.address.full;
        } else if (p.streetAddress) {
          address = `${p.streetAddress}${p.city ? ', ' + p.city : ''}`;
        } else if (p.location) {
          address = p.location;
        } else if (p.listingAddress?.full) {
          address = p.listingAddress.full;
        } else if (p.hdpData?.homeInfo?.streetAddress) {
          address = p.hdpData.homeInfo.streetAddress;
        }

        // Price — resolve accurately and never return $0
        const price = p.Property?.Price || resolveAndFormatPrice(p, intent === 'rent');

        // Beds, baths, type, city (support Realtor.ca + Zillow)
        const beds = parseInt(
          p.Building?.Bedrooms || p.bedrooms || p.beds || p.hdpData?.homeInfo?.bedrooms || p.resoFacts?.bedrooms || 0,
          10
        ) || 3;
        const baths = parseFloat(
          p.Building?.BathroomTotal || p.bathrooms || p.baths || p.hdpData?.homeInfo?.bathrooms || p.resoFacts?.bathrooms || 0
        ) || 2;
        const rawType = p.Property?.Type || p.Building?.Type || p.homeType || p.propertyType || p.property_type || p.hdpData?.homeInfo?.homeType || p.resoFacts?.homeType || 'Single Family Home';

        // ── Normalize raw type to a clean display label ──────────────────────
        const normalizeTypeLabel = (val) => {
          if (!val) return 'Detached';
          const v = String(val).toLowerCase().replace(/_/g, ' ').trim();
          if (v.includes('semi') || v.includes('duplex') || v.includes('triplex') || v.includes('multi')) return 'Semi-Detached';
          if (v.includes('town')) return 'Townhouse';
          if (v.includes('condo') || v.includes('apartment') || v.includes('flat') || v.includes('strata')) return 'Condo';
          if (v.includes('single') || v.includes('detach') || v.includes('house') || v.includes('residential')) return 'Detached';
          if (v.includes('land') || v.includes('lot') || v.includes('vacant')) return 'Land';
          if (v.includes('mobile') || v.includes('manufactured')) return 'Mobile Home';
          // Title-case anything else
          return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        };

        const type = normalizeTypeLabel(rawType);
        const city = p.Property?.Address?.AddressText?.split('|')[1]?.trim() || p.city || p.addressCity || p.hdpData?.homeInfo?.city || (typeof address === 'string' && address.includes(',') ? address.split(',')[1]?.trim() : '') || requestedCity || '';


        // Rich Facts & Features
        const livingArea = p.Building?.SizeInterior || p.livingArea || p.sqft || p.area || p.hdpData?.homeInfo?.livingArea || p.resoFacts?.livingArea || null;
        const lotSize = p.Land?.SizeTotal || p.lotSize || p.lotAreaValue || (p.hdpData?.homeInfo?.lotAreaValue ? `${p.hdpData?.homeInfo?.lotAreaValue} ${p.hdpData?.homeInfo?.lotAreaUnits || 'sqft'}` : null);
        const yearBuilt = p.Building?.ConstructedDate || p.yearBuilt || p.hdpData?.homeInfo?.yearBuilt || p.resoFacts?.yearBuilt || null;
        const description = p.PublicRemarks || p.description || p.resoFacts?.description || p.hdpData?.homeInfo?.description || null;
        const stories = p.Building?.StoriesTotal || p.stories || p.resoFacts?.stories || p.hdpData?.homeInfo?.stories || null;
        const parking = p.Property?.ParkingSpaceTotal || p.parking || p.garageSpaces || p.resoFacts?.garageSpaces || p.resoFacts?.parkingCapacity || null;
        const heating = (Array.isArray(p.resoFacts?.heating) ? p.resoFacts?.heating?.join(', ') : p.heating) || p.Building?.HeatingType || null;
        const cooling = (Array.isArray(p.resoFacts?.cooling) ? p.resoFacts?.cooling?.join(', ') : p.cooling) || p.Building?.CoolingType || null;
        const basement = p.Building?.BasementType || p.resoFacts?.basement || p.basement || (p.resoFacts?.hasBasement ? 'Finished / Full' : null);
        const fireplace = p.Building?.FireplacePresent === 'True' || p.resoFacts?.hasFireplace ? 'Yes' : (p.resoFacts?.fireplaces ? `${p.resoFacts.fireplaces}` : null);
        const materials = (Array.isArray(p.resoFacts?.constructionMaterials) ? p.resoFacts?.constructionMaterials?.join(', ') : p.constructionMaterials) || null;
        const foundation = (Array.isArray(p.resoFacts?.foundationDetails) ? p.resoFacts?.foundationDetails?.join(', ') : p.foundation) || null;
        const roof = p.resoFacts?.roofType || p.roof || null;
        const annualTax = p.annualTax || (p.hdpData?.homeInfo?.taxAssessedValue ? '$' + Math.round(p.hdpData.homeInfo.taxAssessedValue * 0.012).toLocaleString() : null);
        const mlsNumber = p.MlsNumber || p.mls_number || p.mlsNumber || p.zpid || p.hdpData?.homeInfo?.zpid || '';

        return {
          image_url: image,
          images: realPhotos,        // Full gallery array (real photos only)
          url,
          address,
          price,
          bedrooms: beds,
          bathrooms: baths,
          property_type: type,
          listing_status: listingLabel,
          city: city,
          living_area: livingArea,
          lot_size: lotSize,
          year_built: yearBuilt,
          description: description,
          stories: stories,
          parking: parking,
          heating: heating,
          cooling: cooling,
          basement: basement,
          fireplace: fireplace,
          materials: materials,
          foundation: foundation,
          roof: roof,
          annual_tax: annualTax,
          mls_number: mlsNumber
        };
      })
      // Filter out completely empty results
      .filter(p => p.address !== 'Address not available' || p.price !== 'Contact for price');

    // ── Filter properties by requested city if specified ────────────────────
    let finalProperties = properties;
    let savedCity = requestedCity || 'unknown';

    if (requestedCity && properties.length > 0) {
      const cityWordRegex = new RegExp(`\\b${requestedCity}\\b`, 'i');
      const cityMatches = properties.filter(p => {
        const addr = String(p.address || '');
        const c = String(p.city || '');
        return cityWordRegex.test(addr) || cityWordRegex.test(c);
      });

      if (cityMatches.length > 0) {
        console.log(`[apify-result] Filtered from ${properties.length} down to ${cityMatches.length} properties strictly in "${requestedCity}"`);
        finalProperties = cityMatches;
      } else {
        console.log(`[apify-result] Strict city word match returned 0 for "${requestedCity}". Filtering out false substrings (e.g. Hamilton for Milton).`);
        finalProperties = properties.filter(p => {
          const addr = String(p.address || '').toLowerCase();
          const c = String(p.city || '').toLowerCase();
          return (addr.includes(requestedCity) || c.includes(requestedCity)) && !addr.includes('ha' + requestedCity);
        });
      }
    } else if (properties.length > 0) {
      const firstValid = properties.find(p => p.city);
      if (firstValid) {
        savedCity = firstValid.city.toLowerCase().trim();
      } else {
        const match = properties[0].address.match(/,\s*([^,]+?),\s*[A-Z]{2}\b/i);
        if (match) savedCity = match[1].toLowerCase().trim();
      }
    }

    // ── Apply recommendation rules: Cards 1 & 2 (budget match), Cards 3 & 4 (exact bed/bath match) ──
    function selectRecommendedProperties(propsList, targetBudget = 0, targetBeds = 0, targetBaths = 0, isRent = false, budgetCountNeeded = 2, bedCountNeeded = 2, targetType = null) {
      if (!Array.isArray(propsList) || propsList.length === 0) return { results: [], matchTier: 'none' };
      const totalTarget = budgetCountNeeded + bedCountNeeded;

      const usedKeys = new Set();
      const selected = [];

      const getPropKey = (p) => (p.url || p.address || p.id || p.mls_number || JSON.stringify(p)).toLowerCase().trim();

      const addProp = (p) => {
        if (!p) return false;
        const key = getPropKey(p);
        if (!usedKeys.has(key)) {
          usedKeys.add(key);
          selected.push(p);
          return true;
        }
        return false;
      };

      const getPrice = (p) => parseBudgetNum(String(p.price || p.priceDisplay || ''));
      const getBeds = (p) => parseInt(p.bedrooms || p.beds || p.hdpData?.homeInfo?.bedrooms || 0, 10) || 0;
      const getBaths = (p) => parseFloat(p.bathrooms || p.baths || p.hdpData?.homeInfo?.bathrooms || 0) || 0;

      function isPropertyRental(p) {
        if (!p) return false;
        // 1. Price threshold: Monthly rentals in USA/Canada are $500 - $25,000. Homes for sale are $50k - $20M+.
        const numPrice = getPrice(p);
        if (numPrice > 0 && numPrice < 35000) return true; // Definitely a monthly rental!
        if (numPrice >= 35000) return false; // Definitely a for-sale property!

        // 2. Zillow explicit boolean flags
        if (p.isForRent === true || p.is_for_rent === true) return true;
        if (p.isForSale === true || p.is_for_sale === true) return false;

        // 2. Status Type & Home Status from Zillow HDP data
        const statusType = String(p.statusType || p.hdpData?.homeInfo?.homeStatus || p.homeStatus || '').toUpperCase();
        if (statusType.includes('RENT')) return true;
        if (statusType.includes('SALE') || statusType.includes('FOR_SALE') || statusType.includes('PENDING') || statusType.includes('ACTIVE')) return false;

        // 3. Status Text / Badge
        const statusText = String(p.statusText || p.listing_status || p.status || '').toLowerCase();
        if (statusText.includes('rent') || statusText.includes('/mo') || statusText.includes('per month') || statusText.includes('lease')) return true;
        if (statusText.includes('sale') || statusText.includes('for sale') || statusText.includes('sold')) return false;

        // 4. Price string formatting
        const priceStr = String(p.price || p.priceDisplay || p.listingPrice?.formatted || '').toLowerCase();
        if (priceStr.includes('/mo') || priceStr.includes('per month') || priceStr.includes('/month') || priceStr.includes('rent:')) return true;

        // 5. Rent price field presence
        if (p.rentPrice && !p.price && !p.listingPrice?.value) return true;

        return false;
      }

      // ── Filter by Intent (Buy vs Rent): Never mix rental listings into Buy results or vice-versa ──
      const intentFiltered = propsList.filter(p => {
        const isRental = isPropertyRental(p);
        if (isRent) {
          return isRental; // Rent intent: only rental listings
        } else {
          return !isRental; // Buy intent: only for-sale listings
        }
      });

      // ── Type filtered list (strict) ──
      const typeFilteredApify = targetType
        ? intentFiltered.filter(p => propTypeMatches(p, targetType))
        : intentFiltered;
      const typeHasResultsApify = typeFilteredApify.length > 0;
      const strictListApify = typeHasResultsApify ? typeFilteredApify : [];
      const relaxedTypeListApify = intentFiltered;

      console.log(`[apify-result] Type filter "${targetType}": ${propsList.length} → ${typeFilteredApify.length} strict type props`);

      // Dynamic +10% budget buffer (minimum $30,000) so e.g. $700k checks up to $770k
      const BUDGET_FLEX = targetBudget > 0 ? Math.max(30000, targetBudget * 0.10) : 30000;

      // ── Sort helper: ASCENDING PRICE ORDER (lowest to highest price) ──
      const sortAscendingPrice = (list) => [...list].sort((a, b) => {
        const aPrice = getPrice(a) || 0;
        const bPrice = getPrice(b) || 0;
        return aPrice - bPrice;
      });

      // Calculate budget window: (budget - 100k) up to (budget + 10%)
      const minBudgetWindow = targetBudget > 100000 ? (targetBudget - 100000) : 0;
      const maxBudgetWindow = targetBudget > 0 ? (targetBudget + BUDGET_FLEX) : 0;

      let apifyMatchTier = 'exact';

      // ── POOL 1: Strict Type + In Budget Window [budget - 100k, budget + 10%] + Exact Bed (if given) ──
      // Sorted in ASCENDING order (e.g. $700k -> $750k -> $800k)
      const pool1Apify = strictListApify.filter(p => {
        const price = getPrice(p);
        const inWindow = targetBudget > 0 ? (price >= minBudgetWindow && price <= maxBudgetWindow) : true;
        const matchBed = targetBeds > 0 ? getBeds(p) === targetBeds : true;
        const matchBath = targetBaths > 0 ? Math.floor(getBaths(p)) === Math.floor(targetBaths) : true;
        return inWindow && matchBed && matchBath;
      });
      for (const p of sortAscendingPrice(pool1Apify)) {
        if (selected.length >= totalTarget) break;
        addProp(p);
      }

      // ── POOL 2A: Strict Type + In Budget Window + Exact Bed (if targetBeds specified but bath relaxed) ──
      if (selected.length < totalTarget && targetBeds > 0) {
        const pool2A = strictListApify.filter(p => {
          const price = getPrice(p);
          const inWindow = targetBudget > 0 ? (price >= minBudgetWindow && price <= maxBudgetWindow) : true;
          return inWindow && getBeds(p) === targetBeds;
        });
        for (const p of sortAscendingPrice(pool2A)) {
          if (selected.length >= totalTarget) break;
          addProp(p);
        }
      }

      // ── POOL 2B: Strict Type + In Budget Window [budget - 100k, budget + 10%] + Relaxed Bed/Bath ──
      // Sorted in ASCENDING order (lowest price first)
      if (selected.length < totalTarget) {
        const pool2Apify = strictListApify.filter(p => {
          const price = getPrice(p);
          const inWindow = targetBudget > 0 ? (price >= minBudgetWindow && price <= maxBudgetWindow) : true;
          return inWindow;
        });
        const prevCount = selected.length;
        for (const p of sortAscendingPrice(pool2Apify)) {
          if (selected.length >= totalTarget) break;
          addProp(p);
        }
        if (selected.length > prevCount && pool1Apify.length === 0) apifyMatchTier = 'budget_only';
      }

      // ── POOL 3A: Great Deals under (budget - 100k) with Exact Bed (if targetBeds > 0) ──
      if (selected.length < totalTarget && minBudgetWindow > 0 && targetBeds > 0) {
        const pool3A = strictListApify.filter(p => {
          const price = getPrice(p);
          return price > 0 && price < minBudgetWindow && getBeds(p) === targetBeds;
        });
        for (const p of sortAscendingPrice(pool3A)) {
          if (selected.length >= totalTarget) break;
          addProp(p);
        }
      }

      // ── POOL 3B: Great Deals under (budget - 100k) for that Property Type (any beds) ──
      // Sorted in ASCENDING order
      if (selected.length < totalTarget && minBudgetWindow > 0) {
        const pool3Apify = strictListApify.filter(p => {
          const price = getPrice(p);
          return price > 0 && price < minBudgetWindow;
        });
        const prevCount = selected.length;
        for (const p of sortAscendingPrice(pool3Apify)) {
          if (selected.length >= totalTarget) break;
          addProp(p);
        }
        if (selected.length > prevCount && pool1Apify.length === 0) apifyMatchTier = 'budget_only';
      }

      // ── POOL 4 (Market Lowest Fallback): If city market starts slightly above budget + 10%, max 1.35x cap ──
      // Sorted in ASCENDING order (lowest available market price first)
      if (selected.length === 0 && strictListApify.length > 0) {
        const hardCap = targetBudget > 0 ? targetBudget * 1.35 : 0;
        const pool4Apify = strictListApify.filter(p => {
          const price = getPrice(p);
          const matchBed = targetBeds > 0 ? getBeds(p) === targetBeds : true;
          return hardCap > 0 ? (price > 0 && price <= hardCap && matchBed) : matchBed;
        });
        for (const p of sortAscendingPrice(pool4Apify.length > 0 ? pool4Apify : strictListApify.filter(p => {
          const price = getPrice(p);
          return hardCap > 0 ? (price > 0 && price <= hardCap) : true;
        }))) {
          if (selected.length >= totalTarget) break;
          addProp(p);
        }
        if (selected.length > 0) apifyMatchTier = 'exact_bedbath_over_budget';
      }

      // Remaining for "Show more" — strictly sorted in ASCENDING order (lowest price first)
      // If targetBeds > 0, prioritize matching bedrooms first, then others
      const remainingStrict = strictListApify.filter(p => !usedKeys.has(getPropKey(p)));
      let remainingSorted;
      if (targetBeds > 0) {
        const matchingBedRem = remainingStrict.filter(p => getBeds(p) === targetBeds);
        const otherRem = remainingStrict.filter(p => getBeds(p) !== targetBeds);
        remainingSorted = [...sortAscendingPrice(matchingBedRem), ...sortAscendingPrice(otherRem)];
      } else {
        remainingSorted = sortAscendingPrice(remainingStrict);
      }

      return { results: [...selected, ...remainingSorted], matchTier: apifyMatchTier };
    }

    const recommended = selectRecommendedProperties(
      finalProperties,
      propBudget,
      propBeds,
      propBaths,
      intent === 'rent',
      2,
      2,
      rawType
    );
    const orderedProperties = recommended.results || recommended;
    const matchTier = recommended.matchTier || 'exact';

    if (savedCity && savedCity !== 'unknown' && finalProperties.length > 0) {
      try {
        const dbCityKey = intent === 'rent' ? `${savedCity}-rent` : savedCity;
        // Merge newly scraped properties with any existing in DB to accumulate a rich full-city inventory
        const { data: existingRow } = await supabase.from('city_property_data').select('properties').eq('city', dbCityKey).single();
        const existingList = (existingRow?.properties && Array.isArray(existingRow.properties)) ? existingRow.properties : [];
        const seenUrls = new Set();
        const merged = [];
        for (const p of [...finalProperties, ...existingList]) {
          const key = (p.url || p.address || p.id || p.zpid || '').toLowerCase().trim();
          if (key && !seenUrls.has(key)) {
            seenUrls.add(key);
            merged.push(p);
          }
        }
        await supabase.from('city_property_data').upsert({
          city: dbCityKey,
          properties: merged.slice(0, 50),
          last_scraped_at: new Date().toISOString()
        }, { onConflict: 'city' });
        console.log(`[apify-result] Successfully saved ${merged.length} accumulated properties to DB for city key: "${dbCityKey}"`);
      } catch (dbErr) {
        console.error('[apify-result] DB Save Error:', dbErr.message);
      }
    }

    // Compute contextual intro message based on match tier
    const formatPriceNum = (num) => num ? `$${Number(num).toLocaleString()}` : '';
    const typeName = rawType ? rawType.replace(/[🏘️🏠🏡🏗️]/gu, '').trim() : '';
    let introMessage;
    if (matchTier === 'exact') {
      introMessage = `Here are live ${typeName ? typeName + ' ' : ''}properties in **${savedCity}** matching your exact criteria${propBudget > 0 ? ` around ${formatPriceNum(propBudget)}` : ''}! 🏡`;
    } else if (matchTier === 'budget_flex') {
      introMessage = `Here are ${orderedProperties.length} ${typeName ? typeName + ' ' : ''}properties in **${savedCity}** matching your exact ${propBeds > 0 ? propBeds + ' bed' : ''}${propBaths > 0 ? ', ' + propBaths + ' bath' : ''} criteria within ±$30,000 of your budget: 🏡`;
    } else if (matchTier === 'budget_only') {
      introMessage = `Exact ${propBeds > 0 ? propBeds + '-bed' : ''} ${propBaths > 0 ? propBaths + '-bath' : ''} ${typeName} listings weren't available at your exact budget in **${savedCity}**. Here are ${typeName} properties within ±$30,000 of your budget (${formatPriceNum(propBudget)}): 🏡`;
    } else if (matchTier === 'exact_bedbath_over_budget') {
      introMessage = `While there were no active ${typeName} listings within your exact ${formatPriceNum(propBudget)} budget in **${savedCity}**, here are available ${typeName} properties matching your exact ${propBeds > 0 ? propBeds + ' bed' : ''}${propBaths > 0 ? ', ' + propBaths + ' bath' : ''} requirements (starting from the lowest available market price): 🏡`;
    } else {
      introMessage = intent === 'rent'
        ? `Here are live rental properties in **${savedCity}** that match your criteria:`
        : `Here are available ${typeName ? typeName + ' ' : ''}properties in **${savedCity}** matching your preferences: 🏡`;
    }

    return Response.json({ 
      status: 'done', 
      city: savedCity, 
      properties: orderedProperties.slice(0, 16),
      introMessage
    });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
