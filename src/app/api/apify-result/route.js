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
    if (!items || items.length === 0) return Response.json({ status: 'empty' });

    // Format as property objects for frontend
    const properties = items
      .filter(p => (p.mainImage || p.imgSrc) && (p.propertyUrl || p.detailUrl))
      .slice(0, 4)
      .map(p => ({
        image_url: p.mainImage || p.imgSrc || '',
        url: p.propertyUrl || p.detailUrl || '',
        address: p.listingAddress?.full || p.address || 'Unknown',
        price: p.listingPrice?.formatted || p.price || 'Contact for price',
        bedrooms: p.bedrooms || '?',
        bathrooms: p.bathrooms || '?',
        property_type: p.homeType || p.cardType || 'Property',
        listing_status: p.listingStatus === 'forRent' ? '🔵 For Rent' : '🟢 For Sale'
      }));

    return Response.json({ status: 'done', properties });
  } catch (e) {
    console.error('[apify-result] Error:', e.message);
    return Response.json({ status: 'error' });
  }
}
