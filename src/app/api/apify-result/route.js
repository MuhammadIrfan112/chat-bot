import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const botName = searchParams.get('botName') || searchParams.get('agentName') || 'your realtor';

    const parseBudgetNum = (text) => {
      if (!text) return 0;
      if (typeof text === 'number') return text > 0 ? text : 0;
      const t = String(text).replace(/,/g, '').toLowerCase().trim();
      
      // 1. Range support: e.g. '$900k - $1.2M' or '600k - 800k' -> pick highest maximum budget
      const millionMatches = [...t.matchAll(/([\d]+(?:\.[\d]+)?)\s*(?:m|million)\b/g)];
      const kMatches = [...t.matchAll(/([\d]+(?:\.[\d]+)?)\s*(?:k|thousand)\b/g)];
      
      let maxBudget = 0;
      for (const m of millionMatches) {
        const val = Math.round(parseFloat(m[1]) * 1_000_000);
        if (val > maxBudget) maxBudget = val;
      }
      for (const k of kMatches) {
        const val = Math.round(parseFloat(k[1]) * 1_000);
        if (val > maxBudget) maxBudget = val;
      }
      if (maxBudget > 0) return maxBudget;

      // 2. Direct clean digits parsing (removes $, C$, CAD, spaces)
      const digits = t.replace(/[^0-9]/g, '');
      if (digits && digits.length >= 3) {
        return parseInt(digits, 10);
      }
      return 0;
    };

    const propBudget = parseBudgetNum(rawBudget);
    const propBeds = parseInt(rawBeds, 10) || 0;
    const propBaths = parseFloat(rawBaths) || 0;

    const isCanadianLocation = (city, state) => {
      const canadianProvinces = ['on', 'ontario', 'bc', 'british columbia', 'ab', 'alberta', 'qc', 'quebec', 'mb', 'manitoba', 'sk', 'saskatchewan', 'ns', 'nova scotia', 'nb', 'new brunswick', 'nl', 'pe'];
      const st = String(state || '').toLowerCase().trim();
      const c = String(city || '').toLowerCase().trim();
      if (st && canadianProvinces.includes(st)) return true;
      for (const prov of canadianProvinces) {
        if (c.endsWith(`, ${prov}`) || c.endsWith(` ${prov}`) || c.includes(`, ${prov},`)) return true;
      }
      const majorCanadianCities = [
        'toronto', 'hamilton', 'mississauga', 'brampton', 'ottawa', 'vancouver', 'calgary', 'edmonton', 
        'montreal', 'winnipeg', 'halifax', 'victoria', 'london', 'markham', 'vaughan', 'kitchener', 
        'windsor', 'burlington', 'oshawa', 'barrie', 'milton', 'oakville', 'guelph', 'cambridge', 
        'whitby', 'ajax', 'pickering', 'waterloo', 'saskatoon', 'regina', 'kelowna', 'surrey', 'burnaby', 'richmond'
      ];
      if (majorCanadianCities.some(mc => c.includes(mc))) return true;
      return false;
    };

    function normalizeHomeType(val) {
      if (!val) return '';
      const v = String(val).toLowerCase().replace(/_/g, ' ');
      // Check MULTI_FAMILY before 'single' or 'family'
      if (v.includes('multi') || v.includes('duplex') || v.includes('triplex') || v.includes('two unit') || v.includes('2 unit') || v.includes('in-law') || v.includes('legal suite') || v.includes('secondary suite')) return 'multi-family';
      // Check SEMI-DETACHED / LINK before 'detach' or 'single'
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
      // Also check address, description and title fields for property type keywords (needed for Zillow Canada)
      const descText = String(p.description || p.PublicRemarks || p.remarks || p.title || p.statusText || '').toLowerCase();
      const addrText = String(p.address || '').toLowerCase();
      const fullSearchText = rawPropType + ' ' + descText + ' ' + addrText;
      const pType = normalizeHomeType(rawPropType);
      const pTypeFromDesc = normalizeHomeType(fullSearchText);
      const requestedTypes = requestedType.toLowerCase().split(',').map(t => t.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim()).filter(Boolean);

      return requestedTypes.some(req => {
        if (req.includes('multi') || req.includes('duplex') || req.includes('triplex')) {
          // For Zillow Canada: also check description for duplex/triplex/multi keywords
          return pType === 'multi-family' || pTypeFromDesc === 'multi-family' ||
            fullSearchText.includes('duplex') || fullSearchText.includes('triplex') ||
            fullSearchText.includes('multi') || fullSearchText.includes('two unit') ||
            fullSearchText.includes('2 unit') || fullSearchText.includes('in-law') ||
            fullSearchText.includes('legal suite') || fullSearchText.includes('secondary suite');
        }
        if (req.includes('town')) return pType === 'townhouse' || rawPropType.includes('town');
        if (req.includes('condo') || req.includes('apartment') || req.includes('flat') || req.includes('strata')) return pType === 'condo' || rawPropType.includes('condo') || rawPropType.includes('apartment');
        if (req.includes('land') || req.includes('lot') || req.includes('vacant')) return pType === 'land' || rawPropType.includes('land') || rawPropType.includes('lot') || rawPropType.includes('vacant');
        if (req.includes('manufactured') || req.includes('mobile')) return pType === 'manufactured' || rawPropType.includes('manufactured') || rawPropType.includes('mobile');
        if ((req.includes('detach') && !req.includes('semi')) || req.includes('single') || req.includes('house')) return pType === 'detached' || rawPropType.includes('single') || rawPropType.includes('detach');
        if (req.includes('semi') || req.includes('link')) return pType === 'semi-detached' || pType === 'townhouse';
        return pType.includes(req) || pTypeFromDesc.includes(req);
      });
    }

    if (!runId) return Response.json({ error: 'Missing runId' }, { status: 400 });

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

    // Check run status with 3-attempt retry for DNS / network resilience
    let statusData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const statusRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
        );
        if (statusRes.ok) {
          statusData = await statusRes.json();
          break;
        }
      } catch (fetchErr) {
        console.warn(`[apify-result] Status check attempt ${attempt} failed:`, fetchErr.message);
        if (attempt === 3) return Response.json({ status: 'running' }); // Keep frontend polling instead of error
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!statusData?.data) {
      return Response.json({ status: 'running' });
    }

    const runStatus = statusData.data.status;
    console.log(`[apify-result] runId=${runId} status=${runStatus} intent=${intent} budget=${propBudget} beds=${propBeds} baths=${propBaths}`);

    if (runStatus === 'RUNNING' || runStatus === 'READY' || runStatus === 'CREATED') {
      return Response.json({ status: 'running' });
    }

    let items = [];
    if (runStatus === 'SUCCEEDED') {
      const datasetId = statusData.data.defaultDatasetId;
      if (datasetId) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const itemsRes = await fetch(
              `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
            );
            if (itemsRes.ok) {
              items = await itemsRes.json();
              console.log('[apify-result] Raw items count:', items?.length);
              break;
            }
          } catch (fetchErr) {
            console.warn(`[apify-result] Dataset fetch attempt ${attempt} failed:`, fetchErr.message);
            if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
    } else {
      console.log('[apify-result] Run did not succeed (' + runStatus + '), using fallback properties for ' + requestedCity);
    }

    let rawItems = (items && Array.isArray(items) && items.length > 0) ? items : [];

    // If Zillow returned 0 items — fallback to Realtor.ca ONLY for Canadian cities
    if (rawItems.length === 0 && isCanadianLocation(requestedCity)) {
      console.log('[apify-result] Zillow returned 0 items — falling back to Realtor.ca for Canadian city:', requestedCity, 'type:', rawType);
      try {
        const realtorRes = await fetch(
          `https://api.apify.com/v2/acts/solidcode~realtorca-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=45`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: requestedCity ? `${requestedCity}, Ontario` : 'Ontario',
              listingType: intent === 'rent' ? 'rent' : 'sale',
              maxItems: 50
            })
          }
        );
        if (realtorRes.ok) {
          const realtorItems = await realtorRes.json();
          if (Array.isArray(realtorItems) && realtorItems.length > 0) {
            console.log('[apify-result] Realtor.ca fallback returned', realtorItems.length, 'items');
            rawItems = realtorItems;
          } else {
            console.log('[apify-result] Realtor.ca also returned 0 items — returning empty status');
            return Response.json({ status: 'empty', properties: [], city: requestedCity });
          }
        }
      } catch (realtorErr) {
        console.error('[apify-result] Realtor.ca fallback error:', realtorErr.message);
      }
    }

    if (rawItems.length === 0) {
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
      // 1. Primary price fields (support standard & rental multi-unit building cards)
      const primaryNum = parseValidPriceNum(
        p.price || 
        p.rentPrice || 
        p.minPrice ||
        p.units?.[0]?.price ||
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
          // Realtor.ca format (media.images with high_res_url or Property.Photo)
          if (Array.isArray(p.media?.images) && p.media.images.length > 0) {
            return p.media.images.map(img => (typeof img === 'string' ? img : (img.high_res_url || img.medium_res_url || img.low_res_url))).filter(Boolean);
          }
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
          (p.attributes?.realtor_ca?.source_details?.relative_url_en ? `https://www.realtor.ca${p.attributes.realtor_ca.source_details.relative_url_en}` : null) ||
          (p.RelativeDetailsURL ? `https://www.realtor.ca${p.RelativeDetailsURL}` : null) ||
          p.propertyUrl ||
          p.detailUrl ||
          p.url ||
          p.link ||
          p.hdpData?.homeInfo?.detailUrl ||
          (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : 'https://www.realtor.ca');

        // Address — try Realtor.ca and all known Zillow field combinations
        let address = 'Address not available';
        if (p.location?.address && typeof p.location.address === 'string') {
          address = p.location.address;
        } else if (p.Property?.Address?.AddressText) {
          address = p.Property.Address.AddressText.replace(/\|/g, ', ');
        } else if (typeof p.address === 'string' && p.address.trim()) {
          address = p.address;
        } else if (p.addressStreet && p.addressCity) {
          address = `${p.addressStreet}, ${p.addressCity}, ${p.addressState || ''} ${p.addressZipcode || ''}`.trim();
        } else if (p.address?.full) {
          address = p.address.full;
        } else if (p.streetAddress) {
          address = `${p.streetAddress}${p.city ? ', ' + p.city : ''}`;
        } else if (typeof p.location === 'string') {
          address = p.location;
        } else if (p.listingAddress?.full) {
          address = p.listingAddress.full;
        } else if (p.hdpData?.homeInfo?.streetAddress) {
          address = p.hdpData.homeInfo.streetAddress;
        }

        // Price — resolve accurately and never return $0
        let price = resolveAndFormatPrice(p, intent === 'rent');
        if (!price || price === 'Contact for price') {
          const rawNum = parseBudgetNum(p.pricing?.display_price || p.pricing?.amount || p.Property?.Price || p.price || p.unformattedPrice);
          if (rawNum > 0) {
            price = '$' + rawNum.toLocaleString('en-US') + (intent === 'rent' ? '/mo' : '');
          } else {
            price = 'Contact for price';
          }
        }

        // Beds, baths, type, city (support Realtor.ca + Zillow)
        const beds = parseInt(
          p.property?.building?.bedrooms || p.Building?.Bedrooms || p.bedrooms || p.beds || p.units?.[0]?.beds || p.hdpData?.homeInfo?.bedrooms || p.resoFacts?.bedrooms || 0,
          10
        ) || 3;
        const baths = parseFloat(
          p.property?.building?.bathroom_total || p.Building?.BathroomTotal || p.bathrooms || p.baths || 0
        ) || 2;
        const itemRawType = p.property?.building?.type || p.property?.property_type || p.Property?.Type || p.Building?.Type || p.homeType || p.propertyType || p.property_type || p.hdpData?.homeInfo?.homeType || p.resoFacts?.homeType || (rawType || 'Residential');

        // ── Normalize raw type to a clean display label ──────────────────────
        const normalizeTypeLabel = (val) => {
          if (!val) return 'Detached';
          const v = String(val).toLowerCase().replace(/_/g, ' ').trim();
          if (v.includes('duplex') || v.includes('triplex') || v.includes('multi')) return 'Multi-Family';
          if (v.includes('semi') || v.includes('link')) return 'Semi-Detached';
          if (v.includes('town') || v.includes('row')) return 'Townhouse';
          if (v.includes('condo') || v.includes('apartment') || v.includes('flat') || v.includes('strata')) return 'Condo';
          if (v.includes('single') || v.includes('detach') || v.includes('house') || v.includes('residential')) return 'Detached';
          if (v.includes('land') || v.includes('lot') || v.includes('vacant')) return 'Land';
          if (v.includes('mobile') || v.includes('manufactured')) return 'Mobile Home';
          return val.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        };

        const type = normalizeTypeLabel(itemRawType);
        const city = (typeof p.location?.address === 'string' && p.location.address.includes(',') ? p.location.address.split(',')[1]?.replace(/\(.*?\)/g, '').trim() : '') || p.Property?.Address?.AddressText?.split('|')[1]?.trim() || p.city || p.addressCity || p.hdpData?.homeInfo?.city || (typeof address === 'string' && address.includes(',') ? address.split(',')[1]?.replace(/\(.*?\)/g, '').trim() : '') || requestedCity || '';


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

    // ── Auto-save fresh scraped properties to Supabase Database (city_property_data) ──
    const saveToDatabase = async (cityToSave, propsToSave) => {
      try {
        if (!cityToSave || !Array.isArray(propsToSave) || propsToSave.length === 0) return;
        const cityKey = cityToSave.toLowerCase().trim().split(',')[0].trim();
        if (!cityKey) return;

        // 1. Fetch existing properties in city_property_data to merge without duplicates
        const { data: existingRow } = await supabase
          .from('city_property_data')
          .select('properties')
          .eq('city', cityKey)
          .single();

        const existingProps = Array.isArray(existingRow?.properties) ? existingRow.properties : [];
        const seenKeys = new Set(existingProps.map(p => (p.address || p.url || p.zpid || '').toLowerCase().trim()));
        const mergedProps = [...existingProps];

        for (const p of propsToSave) {
          const k = (p.address || p.url || p.zpid || '').toLowerCase().trim();
          if (k && !seenKeys.has(k)) {
            seenKeys.add(k);
            mergedProps.push(p);
          }
        }

        const finalToStore = mergedProps.length > 0 ? mergedProps : propsToSave;

        // 2. Upsert into city_property_data for instant bot retrieval in future chats
        const { error: upsertErr } = await supabase.from('city_property_data').upsert(
          {
            city: cityKey,
            properties: finalToStore,
            last_scraped_at: new Date().toISOString()
          },
          { onConflict: 'city' }
        );

        if (upsertErr) {
          console.error('[apify-result] Database auto-save error for city_property_data:', upsertErr.message);
        } else {
          console.log(`[apify-result] Successfully auto-saved ${finalToStore.length} properties for "${cityKey}" in database.`);
        }
      } catch (dbErr) {
        console.error('[apify-result] Auto-save database error:', dbErr.message);
      }
    };

    if (finalProperties.length > 0) {
      saveToDatabase(savedCity || requestedCity, finalProperties);
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

      // ── Sort helper: ASCENDING PRICE ORDER (lowest to highest price) ──
      const sortAscendingPrice = (list) => [...list].sort((a, b) => {
        const aPrice = getPrice(a) || 0;
        const bPrice = getPrice(b) || 0;
        return aPrice - bPrice;
      });

      function isPropertyRental(p) {
        if (!p) return false;
        // 1. Zillow explicit rental status
        if (p.listingStatus === 'forRent' || p.cardType === 'apartmentBuilding' || (Array.isArray(p.units) && p.units.length > 0)) return true;
        if (p.isForRent === true || p.is_for_rent === true) return true;
        if (p.isForSale === true || p.is_for_sale === true) return false;

        // 2. Price threshold: Monthly rentals in USA/Canada are $500 - $35,000. Homes for sale are $50k - $20M+.
        const numPrice = getPrice(p);
        if (numPrice > 0 && numPrice < 35000) return true; // Definitely a monthly rental!
        if (numPrice >= 35000) return false; // Definitely a for-sale property!

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
      const relaxedTypeListApify = intentFiltered;

      console.log(`[apify-result] Type filter "${targetType}": ${propsList.length} → ${typeFilteredApify.length} strict type props`);

      // Price floor: start from budget-100k for buy (rent: $150 below budget, e.g. $2000 → $1850), NO upper limit
      const minBudgetFloor = targetBudget > 0
        ? Math.max(0, isRent ? (targetBudget - 150) : (targetBudget - 100000))
        : 0;

      // 1. First priority: properties of exact type at or above floor (sorted ascending)
      const aboveFloor = (typeHasResultsApify ? typeFilteredApify : []).filter(p => {
        const price = getPrice(p);
        return minBudgetFloor === 0 || price <= 0 || price >= minBudgetFloor;
      });
      for (const p of sortAscendingPrice(aboveFloor)) {
        addProp(p);
      }

      // 2. If fewer than 4, fill remaining slots from same type below floor (closest to budget first)
      if (selected.length < 4 && typeHasResultsApify) {
        const belowFloor = typeFilteredApify.filter(p => {
          const price = getPrice(p);
          return price > 0 && price < minBudgetFloor;
        });
        const sortedBelowFloor = [...belowFloor].sort((a, b) => (getPrice(b) || 0) - (getPrice(a) || 0));
        for (const p of sortedBelowFloor) {
          if (selected.length >= 4) break;
          addProp(p);
        }
      }

      // 3. If still fewer than 4, fill remaining slots from other property types in the city within budget
      if (selected.length < 4 && intentFiltered.length > 0) {
        const otherCityProps = intentFiltered.filter(p => {
          const price = getPrice(p);
          return price <= 0 || (targetBudget > 0 ? price <= targetBudget * 1.15 : true);
        });
        for (const p of sortAscendingPrice(otherCityProps)) {
          if (selected.length >= 4) break;
          addProp(p);
        }
      }

      return { results: selected, matchTier: 'exact' };
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
        const cleanCityName = (savedCity || requestedCity || '').toLowerCase().trim();
        const dbCityKey = cleanCityName;
        // Merge newly scraped properties with existing in DB to accumulate a rich full-city inventory across all types
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
          properties: merged.slice(0, 150),
          last_scraped_at: new Date().toISOString()
        }, { onConflict: 'city' });
        console.log(`[apify-result] Successfully saved ${merged.length} accumulated properties to DB for city key: "${dbCityKey}"`);
      } catch (dbErr) {
        console.error('[apify-result] DB Save Error:', dbErr.message);
      }
    }

    // If Zillow type-filter returned 0 results — try Realtor.ca fallback ONLY for Canadian cities
    if (orderedProperties.length === 0 && isCanadianLocation(savedCity || requestedCity)) {
      console.log('[apify-result] Zillow gave 0 matched properties for type:', rawType, '— trying Realtor.ca async run for Canadian city:', savedCity || requestedCity);
      try {
        // Map user property type to Realtor.ca property type filter
        const mapTypeToRealtor = (t) => {
          if (!t) return null;
          const tl = t.toLowerCase();
          if (tl.includes('multi') || tl.includes('duplex') || tl.includes('triplex')) return 'DuplexTriplex';
          if (tl.includes('town')) return 'RowTownhouse';
          if (tl.includes('condo') || tl.includes('apartment')) return 'ApartmentCondo';
          if (tl.includes('land') || tl.includes('lot') || tl.includes('vacant')) return 'VacantLand';
          if (tl.includes('manufactured') || tl.includes('mobile')) return 'MobileManufactured';
          if (tl.includes('detach') || tl.includes('single') || tl.includes('house')) return 'Detached';
          return null;
        };
        const realtorType = mapTypeToRealtor(rawType);

        // Start async Realtor.ca run
        const startRes = await fetch(
          `https://api.apify.com/v2/acts/petrpatek~realtorca-scraper/runs?token=${APIFY_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: savedCity ? `${savedCity}, ON` : 'ON',
              propertyType: realtorType || undefined,
              transactionType: intent === 'rent' ? 'For Rent' : 'For Sale',
              maxListings: 50
            })
          }
        );

        // If actor not found, try direct URL based Realtor.ca scrape via Zillow with broad filters
        if (!startRes.ok || startRes.status === 404) {
          console.log('[apify-result] Realtor.ca actor not found, using broad Zillow fallback without type filter for:', rawType);
          // Show any available properties in the city sorted by price — not by wrong type
          const sortedAll = sortAscendingPrice([...finalProperties]);
          if (sortedAll.length > 0) {
            const fallbackIntro = `Here are available properties in **${savedCity || requestedCity}** (live from Zillow, sorted by lowest price first). **${rawType ? rawType.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim() : 'This property type'}** listings may be limited in this area — contact ${botName} for off-market opportunities: 🏡`;
            return Response.json({
              status: 'done',
              city: savedCity || requestedCity,
              properties: sortedAll.slice(0, 16),
              introMessage: fallbackIntro
            });
          }
        } else {
          const startData = await startRes.json();
          const realtorRunId = startData.data?.id;
          if (realtorRunId) {
            // Poll for up to 40 seconds
            for (let pi = 0; pi < 10; pi++) {
              await new Promise(r => setTimeout(r, 4000));
              const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${realtorRunId}?token=${APIFY_TOKEN}`);
              const pollData = await pollRes.json();
              if (pollData.data?.status === 'SUCCEEDED') {
                const dsId = pollData.data.defaultDatasetId;
                const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?token=${APIFY_TOKEN}`);
                const realtorItems = await itemsRes.json();
                if (Array.isArray(realtorItems) && realtorItems.length > 0) {
                  console.log('[apify-result] Realtor.ca async run returned', realtorItems.length, 'items for type:', rawType);
                  const realtorFormatted = realtorItems.map((p) => ({
                    address: (p.Address?.AddressText || p.address || 'Address not available').replace(/\|/g, ', '),
                    price: p.Property?.Price || p.price
                      ? '$' + String(p.Property?.Price || p.price).replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : 'Contact for Price',
                    bedrooms: parseInt(p.Building?.Bedrooms || p.bedrooms || 0, 10) || 0,
                    bathrooms: parseFloat(p.Building?.BathroomTotal || p.bathrooms || 0) || 0,
                    property_type: p.Building?.Type || p.propertyType || rawType || 'Residential',
                    homeType: p.Building?.Type || p.propertyType || rawType || 'Residential',
                    images: Array.isArray(p.Property?.Photo) ? p.Property.Photo.map(ph => ph.HighResPath || ph.MedResPath || ph.url).filter(Boolean) : [],
                    image_url: p.Property?.Photo?.[0]?.HighResPath || p.image || '',
                    url: p.RelativeDetailsURL ? `https://www.realtor.ca${p.RelativeDetailsURL}` : (p.url || 'https://www.realtor.ca'),
                    city: savedCity || requestedCity,
                    listing_status: intent === 'rent' ? '🔵 For Rent' : '🟢 For Sale',
                    source: 'realtor.ca'
                  }));
                  const realtorFiltered = realtorFormatted.filter(p => propTypeMatches(p, rawType));
                  const realtorSorted = realtorFiltered.sort((a, b) => {
                    const pa = parseBudgetNum(a.price) || 0;
                    const pb = parseBudgetNum(b.price) || 0;
                    return pa - pb;
                  });
                  if (realtorSorted.length > 0) {
                    saveToDatabase(savedCity || requestedCity, realtorSorted);
                    const realtorIntro = intent === 'rent'
                      ? `Here are live rental ${rawType ? rawType + ' ' : ''}properties in **${savedCity || requestedCity}** from Realtor.ca (sorted by lowest price first): 🏡`
                      : `Here are live ${rawType ? rawType + ' ' : ''}properties in **${savedCity || requestedCity}** from Realtor.ca (sorted by lowest price first): 🏡`;
                    return Response.json({
                      status: 'done',
                      city: savedCity || requestedCity,
                      properties: realtorSorted.slice(0, 16),
                      introMessage: realtorIntro
                    });
                  }
                }
                break;
              } else if (pollData.data?.status === 'FAILED' || pollData.data?.status === 'ABORTED') {
                console.log('[apify-result] Realtor.ca run failed:', pollData.data?.status);
                break;
              }
            }
          }
        }
      } catch (realtorErr2) {
        console.error('[apify-result] Realtor.ca type-fallback error:', realtorErr2.message);
      }
    }

    // If exact type filter within user's floor returned 0, check if ANY properties of that type exist in the dataset
    if (orderedProperties.length === 0 && finalProperties.length > 0) {
      const typeMatchesAnyPrice = finalProperties.filter(p => propTypeMatches(p, rawType));
      if (typeMatchesAnyPrice.length > 0) {
        const sortedTypeProps = sortAscendingPrice(typeMatchesAnyPrice);
        const friendlyType = rawType ? rawType.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim() : 'property';
        const startPrice = sortedTypeProps[0]?.price || 'market price';
        const marketIntro = `Here are available **${friendlyType}** properties in **${savedCity || requestedCity}** starting from ${startPrice} (sorted by lowest price first): 🏡`;
        return Response.json({
          status: 'done',
          city: savedCity || requestedCity,
          properties: sortedTypeProps.slice(0, 16),
          introMessage: marketIntro
        });
      }
    }

    // If exact type returned 0 across the entire city, but other properties exist in the city: show all available city properties
    if (orderedProperties.length === 0 && finalProperties.length > 0) {
      const allCitySorted = sortAscendingPrice(finalProperties);
      const friendlyType = rawType ? rawType.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim() : 'property';
      const fallbackIntro = `Although exact **${friendlyType}** listings are currently limited in **${savedCity || requestedCity}**, here are live properties in **${savedCity || requestedCity}** (sorted by lowest price first): 🏡`;
      return Response.json({
        status: 'done',
        city: savedCity || requestedCity,
        properties: allCitySorted.slice(0, 16),
        introMessage: fallbackIntro
      });
    }

    // Requested type returned 0 across the entire city dataset — return no_results so user can adjust or refine
    if (orderedProperties.length === 0) {
      const friendlyType = rawType ? rawType.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim() : 'this property type';
      let altSuggestion = '';
      const reqLow = (rawType || '').toLowerCase();
      if (reqLow.includes('multi') || reqLow.includes('duplex') || reqLow.includes('triplex')) {
        altSuggestion = ' You may also want to explore **Townhouses** or **Detached Houses**.';
      } else if (reqLow.includes('semi') || reqLow.includes('link')) {
        altSuggestion = ' You can also explore **Townhouses** or **Detached Houses** in this area.';
      } else if (reqLow.includes('land') || reqLow.includes('lot')) {
        altSuggestion = ' Land listings are currently limited in this area.';
      } else if (reqLow.includes('condo') || reqLow.includes('apartment')) {
        altSuggestion = ' You may also want to check nearby areas for more condo options.';
      }
      const noResultMsg = `I wasn't able to find live listings for **${friendlyType}** in **${savedCity || requestedCity || 'this area'}** right now.${altSuggestion}\n\n📞 Feel free to contact ${botName} directly to explore off-market or upcoming opportunities.`;
      return Response.json({
        status: 'no_results',
        city: savedCity || requestedCity,
        properties: [],
        introMessage: noResultMsg
      });
    }

    const introMessage = intent === 'rent'
      ? `Here are live rental ${rawType ? rawType + ' ' : ''}properties in **${savedCity || requestedCity}** (sorted by lowest price first): 🏡`
      : `Here are live ${rawType ? rawType + ' ' : ''}properties in **${savedCity || requestedCity}** (sorted by lowest price first): 🏡`;

    return Response.json({ 
      status: 'done', 
      city: savedCity || requestedCity, 
      properties: orderedProperties.slice(0, 16),
      introMessage
    });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
