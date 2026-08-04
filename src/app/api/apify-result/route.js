export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    if (!runId) return Response.json({ error: 'Missing runId' }, { status: 400 });

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

    // Check run status
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    if (!statusRes.ok) return Response.json({ status: 'error' });

    const statusData = await statusRes.json();
    const runStatus = statusData?.data?.status;

    console.log(`[apify-result] runId=${runId} status=${runStatus}`);

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
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=6`
    );
    if (!itemsRes.ok) return Response.json({ status: 'failed' });

    const items = await itemsRes.json();
    console.log('[apify-result] Raw items count:', items?.length);
    if (items?.[0]) {
      console.log('[apify-result] First item keys:', Object.keys(items[0]));
      console.log('[apify-result] Sample:', JSON.stringify(items[0]).substring(0, 500));
    }
    
    if (!items || items.length === 0) return Response.json({ status: 'empty' });

    // Map ALL items — no filter, try every possible field name
    const properties = items
      .slice(0, 4)
      .map(p => {
        const image = 
          p.mainImage || p.imgSrc || p.image || p.img ||
          p.hdpData?.homeInfo?.miniCardPhotos?.[0]?.url ||
          p.carouselPhotos?.[0]?.url ||
          (Array.isArray(p.photos) ? p.photos[0] : null) ||
          p.thumbnail || '';

        const url =
          p.propertyUrl || p.detailUrl || p.url || p.link ||
          p.hdpData?.homeInfo?.detailUrl ||
          (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : 'https://www.zillow.com/homes/for_rent/');

        const address =
          p.address || p.streetAddress || p.location ||
          p.listingAddress?.full ||
          p.hdpData?.homeInfo?.streetAddress ||
          [p.streetAddress, p.city, p.state].filter(Boolean).join(', ') ||
          'Unknown Address';

        const price =
          p.price || p.rentPrice || p.listingPrice?.formatted ||
          p.hdpData?.homeInfo?.price?.toString() ||
          p.unformattedPrice?.toString() ||
          p.zestimate?.toString() ||
          'Contact for price';

        const beds = p.bedrooms || p.beds || p.hdpData?.homeInfo?.bedrooms || '?';
        const baths = p.bathrooms || p.baths || p.hdpData?.homeInfo?.bathrooms || '?';
        const type = p.homeType || p.cardType || p.hdpData?.homeInfo?.homeType || 'Property';

        return { image_url: image, url, address, price, bedrooms: beds, bathrooms: baths, property_type: type, listing_status: '🔵 For Rent' };
      });

    console.log('[apify-result] Mapped properties:', properties.length);
    return Response.json({ status: 'done', properties });

  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}

