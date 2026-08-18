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
    if (!runId) return Response.json({ error: 'Missing runId' }, { status: 400 });

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

    // Check run status
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    if (!statusRes.ok) return Response.json({ status: 'error' });

    const statusData = await statusRes.json();
    const runStatus = statusData?.data?.status;

    console.log(`[apify-result] runId=${runId} status=${runStatus} intent=${intent}`);

    if (runStatus === 'RUNNING' || runStatus === 'READY' || runStatus === 'CREATED') {
      return Response.json({ status: 'running' });
    }

    if (runStatus !== 'SUCCEEDED') {
      console.log('[apify-result] Run did not succeed:', runStatus);
      return Response.json({ status: 'failed', runStatus });
    }

    // Run finished — fetch results
    const datasetId = statusData?.data?.defaultDatasetId;
    if (!datasetId) return Response.json({ status: 'failed' });

    // Fetch more items so we have enough to save to DB (and show 4, then 2, etc.)
    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=25`
    );
    if (!itemsRes.ok) return Response.json({ status: 'failed' });

    const items = await itemsRes.json();
    console.log('[apify-result] Raw items count:', items?.length);
    if (items?.[0]) {
      console.log('[apify-result] First item keys:', Object.keys(items[0]));
      console.log('[apify-result] Sample:', JSON.stringify(items[0]).substring(0, 600));
    }

    if (!items || items.length === 0) return Response.json({ status: 'empty' });

    // ── Helper: format price nicely ─────────────────────────────────────────
    function formatPrice(raw) {
      if (!raw) return 'Contact for price';
      const str = String(raw);
      // Already formatted (has $ or text like "Contact")
      if (str.startsWith('$') || /[a-zA-Z]/.test(str)) return str;
      // Plain number — add $ and comma separators
      const num = parseInt(str.replace(/[^0-9]/g, ''));
      if (!num || isNaN(num)) return 'Contact for price';
      return '$' + num.toLocaleString('en-US');
    }

    // ── Map items to our standard property card format ──────────────────────
    const listingLabel = intent === 'rent' ? '🔵 For Rent' : '🟢 For Sale';

    const properties = items
      .map(p => {
        // All photos array — collect from carousel or photos fields
        const allPhotos = (() => {
          if (Array.isArray(p.carouselPhotos) && p.carouselPhotos.length > 0) {
            return p.carouselPhotos.map(ph => ph.url || ph).filter(Boolean);
          }
          if (Array.isArray(p.photos) && p.photos.length > 0) {
            return p.photos.map(ph => (typeof ph === 'string' ? ph : ph.url)).filter(Boolean);
          }
          return [];
        })();

        // Helper: reject Google Maps satellite placeholder images
        const isRealPhoto = (url) => url && !url.includes('maps.googleapis.com') && !url.includes('staticmap');

        const realPhotos = allPhotos.filter(isRealPhoto).slice(0, 8);

        // Primary thumbnail — first real photo, fallback to single fields
        const image =
          realPhotos[0] ||
          (isRealPhoto(p.mainImage) ? p.mainImage : null) ||
          (isRealPhoto(p.imgSrc) ? p.imgSrc : null) ||
          (isRealPhoto(p.image) ? p.image : null) ||
          (isRealPhoto(p.thumbnail) ? p.thumbnail : null) ||
          '';

        // URL — build from zpid if direct URL not available
        const url =
          p.propertyUrl ||
          p.detailUrl ||
          p.url ||
          p.link ||
          p.hdpData?.homeInfo?.detailUrl ||
          (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : 'https://www.zillow.com');

        // Address — try combining parts if full address missing
        let address = 'Address not available';
        if (typeof p.address === 'string') {
          address = p.address;
        } else if (p.address && p.address.full) {
          address = p.address.full;
        } else if (p.streetAddress) {
          address = p.streetAddress;
        } else if (p.location) {
          address = p.location;
        } else if (p.listingAddress?.full) {
          address = p.listingAddress.full;
        } else if (p.hdpData?.homeInfo?.streetAddress) {
          address = p.hdpData.homeInfo.streetAddress;
        }

        // Price — handle all Zillow formats
        const rawPrice =
          p.price ||
          p.rentPrice ||
          p.listingPrice?.formatted ||
          p.hdpData?.homeInfo?.price ||
          p.unformattedPrice ||
          p.zestimate ||
          null;
        const price = formatPrice(rawPrice);

        // Beds / Baths / Type
        const beds = p.bedrooms ?? p.beds ?? p.hdpData?.homeInfo?.bedrooms ?? '?';
        const baths = p.bathrooms ?? p.baths ?? p.hdpData?.homeInfo?.bathrooms ?? '?';
        const type = p.homeType || p.cardType || p.hdpData?.homeInfo?.homeType || 'Property';
        const city = p.city || p.address?.city || p.hdpData?.homeInfo?.city || '';

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
          city: city
        };
      })
      // Filter out completely empty results
      .filter(p => p.address !== 'Address not available' || p.price !== 'Contact for price');

    console.log('[apify-result] Mapped properties:', properties.length);

    if (properties.length === 0) {
      return Response.json({ status: 'empty' });
    }

    // Attempt to extract the city name to save into city_property_data
    let savedCity = 'unknown';
    const firstValid = properties.find(p => p.city);
    if (firstValid) {
      savedCity = firstValid.city;
    } else {
      // Try to parse city from address: "123 Main St, Morton Grove, IL 60053"
      const match = properties[0].address.match(/,\s*([^,]+?),\s*[A-Z]{2}\b/i);
      if (match) savedCity = match[1].trim();
    }

    savedCity = savedCity.toLowerCase().trim();

    if (savedCity && savedCity !== 'unknown') {
      try {
        await supabase.from('city_property_data').upsert({
          city: savedCity,
          properties: properties,
          last_scraped_at: new Date().toISOString()
        }, { onConflict: 'city' });
        console.log(`[apify-result] Successfully saved ${properties.length} properties to DB for city: ${savedCity}`);
      } catch (dbErr) {
        console.error('[apify-result] DB Save Error:', dbErr.message);
      }
    }

    return Response.json({ 
      status: 'done', 
      city: savedCity, 
      properties: properties.slice(0, 8) 
    });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
