export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    const intent = searchParams.get('intent') || 'buy'; // 'buy' or 'rent'
    if (!runId) return Response.json({ error: 'Missing runId' }, { status: 400 });

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

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

    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=8`
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
      .slice(0, 4)
      .map(p => {
        // Image — try all known Zillow field names in order of reliability
        const image =
          p.mainImage ||
          p.imgSrc ||
          p.image ||
          p.img ||
          p.thumbnail ||
          p.hdpData?.homeInfo?.miniCardPhotos?.[0]?.url ||
          (Array.isArray(p.carouselPhotos) && p.carouselPhotos[0]?.url) ||
          (Array.isArray(p.photos) && typeof p.photos[0] === 'string' ? p.photos[0] : null) ||
          (Array.isArray(p.photos) && p.photos[0]?.url) ||
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
        const address =
          p.address ||
          p.streetAddress ||
          p.location ||
          p.listingAddress?.full ||
          p.hdpData?.homeInfo?.streetAddress ||
          [p.streetAddress, p.city, p.state].filter(Boolean).join(', ') ||
          'Address not available';

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

        return {
          image_url: image,
          url,
          address,
          price,
          bedrooms: beds,
          bathrooms: baths,
          property_type: type,
          listing_status: listingLabel  // ✅ Correctly 🟢 For Sale or 🔵 For Rent
        };
      })
      // Filter out completely empty results
      .filter(p => p.address !== 'Address not available' || p.price !== 'Contact for price');

    console.log('[apify-result] Mapped properties:', properties.length);

    if (properties.length === 0) {
      const botId = searchParams.get('botId');
      if (botId === 'demo-real-estate-live' || botId === 'demo-real-estate') {
        console.log('[apify-result] Falling back to demo properties for', botId);
        const intentParam = searchParams.get('intent') || 'buy';
        const label = intentParam === 'rent' ? '🔵 For Rent' : '🟢 For Sale';
        const fakeProperties = [
          {
            image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80',
            url: '#',
            address: '124 Maple Street',
            price: '$850,000',
            bedrooms: 3,
            bathrooms: 2,
            property_type: 'Family Home',
            listing_status: label
          },
          {
            image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80',
            url: '#',
            address: '89 Oak Avenue',
            price: '$920,000',
            bedrooms: 4,
            bathrooms: 3,
            property_type: 'Modern House',
            listing_status: label
          },
          {
            image_url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500&q=80',
            url: '#',
            address: '45 Pine Lane',
            price: '$790,000',
            bedrooms: 3,
            bathrooms: 2,
            property_type: 'Family Home',
            listing_status: label
          },
          {
            image_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=500&q=80',
            url: '#',
            address: '232 Cedar Blvd',
            price: '$1,150,000',
            bedrooms: 5,
            bathrooms: 4,
            property_type: 'Luxury Villa',
            listing_status: label
          }
        ];
        return Response.json({ status: 'done', properties: fakeProperties });
      }
      return Response.json({ status: 'empty' });
    }

    return Response.json({ status: 'done', properties });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
