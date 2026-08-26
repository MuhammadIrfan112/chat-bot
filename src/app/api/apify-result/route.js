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
      const v = String(val).toLowerCase();
      // Check SEMI-DETACHED / MULTI-FAMILY first before checking 'detach' or 'single'
      if (v.includes('semi') || v.includes('multi') || v.includes('duplex') || v.includes('triplex')) return 'semi-detached';
      if (v.includes('town')) return 'townhouse';
      if (v.includes('condo') || v.includes('apartment') || v.includes('flat')) return 'condo';
      if (v.includes('single') || v.includes('detach') || v.includes('house')) return 'detached';
      if (v.includes('land') || v.includes('lot')) return 'land';
      return v;
    }

    function propTypeMatches(p, requestedType) {
      if (!requestedType) return true;
      const req = requestedType.toLowerCase().trim();
      const pType = normalizeHomeType(
        p.property_type || p.propertyType || p.homeType || p.home_type || p.type || ''
      );
      // 1. Semi-Detached / Multi-Family (MUST check before detached!)
      if (req.includes('semi') || req.includes('multi') || req.includes('duplex')) {
        return pType === 'semi-detached';
      }
      // 2. Townhouse
      if (req.includes('town')) {
        return pType === 'townhouse';
      }
      // 3. Condo / Apartment
      if (req.includes('condo') || req.includes('apartment') || req.includes('flat')) {
        return pType === 'condo';
      }
      // 4. Detached / Single Family (strictly detached, NOT semi)
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
        // All photos — collect from all known Zillow/Apify photo fields
        const allPhotos = (() => {
          // listingPhotos is the primary field from maxcopell~zillow-scraper
          if (Array.isArray(p.listingPhotos) && p.listingPhotos.length > 0) {
            return p.listingPhotos.map(ph => (typeof ph === 'string' ? ph : ph.url)).filter(Boolean);
          }
          if (Array.isArray(p.carouselPhotos) && p.carouselPhotos.length > 0) {
            return p.carouselPhotos.map(ph => ph.url || ph).filter(Boolean);
          }
          if (Array.isArray(p.photos) && p.photos.length > 0) {
            return p.photos.map(ph => (typeof ph === 'string' ? ph : ph.url)).filter(Boolean);
          }
          if (Array.isArray(p.carouselPhotosComposable) && p.carouselPhotosComposable.length > 0) {
            return p.carouselPhotosComposable.map(ph => ph.url || ph).filter(Boolean);
          }
          // Fallback to single image fields
          if (p.mainImage) return [p.mainImage];
          if (p.imgSrc) return [p.imgSrc];
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

        // URL — build from zpid if direct URL not available
        const url =
          p.propertyUrl ||
          p.detailUrl ||
          p.url ||
          p.link ||
          p.hdpData?.homeInfo?.detailUrl ||
          (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : 'https://www.zillow.com');

        // Address — try all known Zillow field combinations
        let address = 'Address not available';
        if (typeof p.address === 'string' && p.address.trim()) {
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
        const price = resolveAndFormatPrice(p, intent === 'rent');

        // Beds, baths, type, city
        const beds = parseInt(p.bedrooms || p.beds || p.hdpData?.homeInfo?.bedrooms || p.resoFacts?.bedrooms || 0) || 3;
        const baths = parseFloat(p.bathrooms || p.baths || p.hdpData?.homeInfo?.bathrooms || p.resoFacts?.bathrooms || 0) || 2;
        const type = p.homeType || p.propertyType || p.property_type || p.hdpData?.homeInfo?.homeType || p.resoFacts?.homeType || 'Single Family Home';
        const city = p.city || p.addressCity || p.hdpData?.homeInfo?.city || (typeof address === 'string' && address.includes(',') ? address.split(',')[1]?.trim() : '') || requestedCity || '';

        // Rich Facts & Features
        const livingArea = p.livingArea || p.sqft || p.area || p.hdpData?.homeInfo?.livingArea || p.resoFacts?.livingArea || null;
        const lotSize = p.lotSize || p.lotAreaValue || (p.hdpData?.homeInfo?.lotAreaValue ? `${p.hdpData?.homeInfo?.lotAreaValue} ${p.hdpData?.homeInfo?.lotAreaUnits || 'sqft'}` : null);
        const yearBuilt = p.yearBuilt || p.hdpData?.homeInfo?.yearBuilt || p.resoFacts?.yearBuilt || null;
        const description = p.description || p.resoFacts?.description || p.hdpData?.homeInfo?.description || null;
        const stories = p.stories || p.resoFacts?.stories || p.hdpData?.homeInfo?.stories || null;
        const parking = p.parking || p.garageSpaces || p.resoFacts?.garageSpaces || p.resoFacts?.parkingCapacity || null;
        const heating = (Array.isArray(p.resoFacts?.heating) ? p.resoFacts?.heating?.join(', ') : p.heating) || null;
        const cooling = (Array.isArray(p.resoFacts?.cooling) ? p.resoFacts?.cooling?.join(', ') : p.cooling) || null;
        const basement = p.resoFacts?.basement || p.basement || (p.resoFacts?.hasBasement ? 'Finished / Full' : null);
        const fireplace = p.resoFacts?.hasFireplace ? 'Yes' : (p.resoFacts?.fireplaces ? `${p.resoFacts.fireplaces}` : null);
        const materials = (Array.isArray(p.resoFacts?.constructionMaterials) ? p.resoFacts?.constructionMaterials?.join(', ') : p.constructionMaterials) || null;
        const foundation = (Array.isArray(p.resoFacts?.foundationDetails) ? p.resoFacts?.foundationDetails?.join(', ') : p.foundation) || null;
        const roof = p.resoFacts?.roofType || p.roof || null;
        const annualTax = p.annualTax || (p.hdpData?.homeInfo?.taxAssessedValue ? '$' + Math.round(p.hdpData.homeInfo.taxAssessedValue * 0.012).toLocaleString() : null);
        const mlsNumber = p.mls_number || p.mlsNumber || p.zpid || p.hdpData?.homeInfo?.zpid || '';

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
      const cityMatches = properties.filter(p => {
        const addr = String(p.address || '').toLowerCase();
        const c = String(p.city || '').toLowerCase();
        return addr.includes(requestedCity) || c.includes(requestedCity);
      });

      if (cityMatches.length > 0) {
        console.log(`[apify-result] Filtered from ${properties.length} down to ${cityMatches.length} properties strictly in "${requestedCity}"`);
        finalProperties = cityMatches;
      } else {
        // Fallback: If scraper returned properties from that city search URL, keep them rather than showing empty
        console.log(`[apify-result] Strict city filter matched 0, keeping all ${properties.length} scraper results for "${requestedCity}".`);
        finalProperties = properties;
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
      if (!Array.isArray(propsList) || propsList.length === 0) return [];
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

      // ── Filter by Intent (Buy vs Rent): Never mix rental listings into Buy results or vice-versa ──
      const intentFiltered = propsList.filter(p => {
        const price = getPrice(p);
        const status = String(p.listing_status || p.status || '').toLowerCase();
        const priceStr = String(p.price || p.priceDisplay || '').toLowerCase();
        const isRental = priceStr.includes('/mo') || priceStr.includes('per month') || status.includes('rent') || (price > 0 && price < 25000);
        if (isRent) {
          return isRental; // Rent intent: only rental listings
        } else {
          return !isRental; // Buy intent: reject rentals (< 25k, /mo, rent status)
        }
      });

      // Filter by requested property type (strict — no fallback to wrong types)
      const typeFiltered = targetType
        ? intentFiltered.filter(p => propTypeMatches(p, targetType))
        : intentFiltered;
      if (targetType && typeFiltered.length === 0) {
        console.log(`[apify-result] 0 properties matched requested type "${targetType}" out of ${intentFiltered.length} intent-matching properties.`);
        return [];
      }
      const workingList = typeFiltered;
      console.log(`[apify-result] selectRecommended Intent & Type filter "${targetType}": ${propsList.length} → ${workingList.length}`);

      // ── 1. BUDGET CARDS (Cards 1 & 2): within budget (max +10%). Sort by closest to budget, then most beds
      // maxBudget +10%, minBudget -50% of user budget (properties must be in realistic range)
      const maxBudget = targetBudget > 0 ? Math.round(targetBudget * 1.10) : Infinity;
      const minBudget = targetBudget > 0 ? Math.round(targetBudget * 0.50) : 0;

      const budgetPool = [...workingList]
        .filter(p => {
          if (targetBudget <= 0) return true;
          const price = getPrice(p);
          if (price <= 0) return true;
          return price <= maxBudget && price >= minBudget;
        })
        .sort((a, b) => {
          if (targetBudget > 0) {
            const aDiff = getPrice(a) > 0 ? Math.abs(getPrice(a) - targetBudget) : 99999999;
            const bDiff = getPrice(b) > 0 ? Math.abs(getPrice(b) - targetBudget) : 99999999;
            if (aDiff !== bDiff) return aDiff - bDiff;
          }
          return getBeds(b) - getBeds(a);
        });

      let budgetCount = 0;
      for (const p of budgetPool) {
        if (budgetCount >= budgetCountNeeded) break;
        if (addProp(p)) budgetCount++;
      }

      // ── 2. BED/BATH CARDS (Cards 3 & 4): Exact or closest bed & bath match regardless of price
      const bedPool = [...workingList].sort((a, b) => {
        if (targetBeds > 0) {
          const aBedDiff = getBeds(a) > 0 ? Math.abs(getBeds(a) - targetBeds) : 99;
          const bBedDiff = getBeds(b) > 0 ? Math.abs(getBeds(b) - targetBeds) : 99;
          if (aBedDiff !== bBedDiff) return aBedDiff - bBedDiff;
        }
        if (targetBaths > 0) {
          const aBathDiff = getBaths(a) > 0 ? Math.abs(getBaths(a) - targetBaths) : 99;
          const bBathDiff = getBaths(b) > 0 ? Math.abs(getBaths(b) - targetBaths) : 99;
          if (aBathDiff !== bBathDiff) return aBathDiff - bBathDiff;
        }
        return 0;
      });

      let bedCount = 0;
      for (const p of bedPool) {
        if (bedCount >= bedCountNeeded) break;
        if (addProp(p)) bedCount++;
      }

      // ── 3. Backfill from workingList only
      for (const p of workingList) {
        if (selected.length >= totalTarget) break;
        addProp(p);
      }

      const remaining = workingList.filter(p => !usedKeys.has(getPropKey(p)));
      return [...selected, ...remaining];
    }

    const orderedProperties = selectRecommendedProperties(
      finalProperties,
      propBudget,
      propBeds,
      propBaths,
      intent === 'rent',
      2,
      2,
      rawType
    );

    if (savedCity && savedCity !== 'unknown') {
      try {
        const dbCityKey = intent === 'rent' ? `${savedCity}-rent` : savedCity;
        await supabase.from('city_property_data').upsert({
          city: dbCityKey,
          properties: orderedProperties,
          last_scraped_at: new Date().toISOString()
        }, { onConflict: 'city' });
        console.log(`[apify-result] Successfully saved ${orderedProperties.length} properties to DB for city key: "${dbCityKey}"`);
      } catch (dbErr) {
        console.error('[apify-result] DB Save Error:', dbErr.message);
      }
    }

    return Response.json({ 
      status: 'done', 
      city: savedCity, 
      properties: orderedProperties.slice(0, 16) 
    });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
