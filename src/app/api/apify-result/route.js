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

    if (runStatus === 'RUNNING' || runStatus === 'READY' || runStatus === 'CREATED') {
      return Response.json({ status: 'running' });
    }

    if (runStatus !== 'SUCCEEDED') {
      return Response.json({ status: 'failed' });
    }

    // Run finished — fetch results
    const datasetId = statusData?.data?.defaultDatasetId;
    if (!datasetId) return Response.json({ status: 'failed' });

    const itemsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=4`
    );
    if (!itemsRes.ok) return Response.json({ status: 'failed' });

    const items = await itemsRes.json();
    console.log('[apify-result] Raw items count:', items?.length, 'First item keys:', items?.[0] ? Object.keys(items[0]) : 'none');
    
    if (!items || items.length === 0) return Response.json({ status: 'empty' });

    // Format as property objects — accept any item that has at least a price or address
    const properties = items
      .filter(p => p.price || p.listingPrice || p.address || p.streetAddress || p.zpid)
      .slice(0, 4)
      .map(p => ({
        image_url: p.mainImage || p.imgSrc || p.hdpData?.homeInfo?.miniCardPhotos?.[0]?.url || p.carouselPhotos?.[0]?.url || p.photos?.[0] || '',
        url: p.propertyUrl || p.detailUrl || p.hdpData?.homeInfo?.detailUrl || (p.zpid ? `https://www.zillow.com/homedetails/${p.zpid}_zpid/` : ''),
        address: p.address || p.streetAddress || p.listingAddress?.full || p.hdpData?.homeInfo?.streetAddress || 'Unknown Address',
        price: p.price || p.listingPrice?.formatted || p.hdpData?.homeInfo?.price?.toString() || p.unformattedPrice?.toString() || 'Contact for price',
        bedrooms: p.bedrooms || p.beds || p.hdpData?.homeInfo?.bedrooms || '?',
        bathrooms: p.bathrooms || p.baths || p.hdpData?.homeInfo?.bathrooms || '?',
        property_type: p.homeType || p.cardType || p.hdpData?.homeInfo?.homeType || 'Property',
        listing_status: (p.listingStatus === 'forRent' || p.statusText?.toLowerCase()?.includes('rent')) ? '🔵 For Rent' : '🟢 For Sale'
      }));

    console.log('[apify-result] Formatted properties:', properties.length);
    
    if (properties.length === 0) return Response.json({ status: 'empty' });
    return Response.json({ status: 'done', properties });
  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
