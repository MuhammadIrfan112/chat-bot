// Repliers.io API route — fetches real MLS listings based on user requirements
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      city,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minPrice,
      maxPrice,
      propertyType,
      limit = 5
    } = body;

    const apiKey = process.env.REPLIERS_API_KEY;
    const apiUrl = process.env.REPLIERS_API_URL || 'https://api.repliers.io';

    if (!apiKey) {
      return Response.json({ error: 'Repliers API key not configured' }, { status: 500 });
    }

    // Build query params
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (minBedrooms) params.append('minBedrooms', minBedrooms);
    if (maxBedrooms) params.append('maxBedrooms', maxBedrooms);
    if (minBathrooms) params.append('minBathrooms', minBathrooms);
    if (maxBathrooms) params.append('maxBathrooms', maxBathrooms);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (propertyType) params.append('type', propertyType);
    params.append('status', 'A'); // Active listings only
    params.append('resultsPerPage', limit);

    const url = `${apiUrl}/listings?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'REPLIERS-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Repliers API error:', response.status, errText);
      return Response.json({ error: `Repliers API error: ${response.status}`, listings: [] });
    }

    const data = await response.json();
    const rawListings = data.listings || data.results || [];

    // Format listings into a clean, AI-usable format
    const listings = rawListings.slice(0, limit).map(l => {
      // Extract photo URL
      const photo = l.images?.[0] || l.photos?.[0] || l.media?.[0]?.mediaUrl || '';

      // Build address
      const address = [
        l.address?.streetNumber,
        l.address?.streetName,
        l.address?.streetSuffix,
        l.address?.city,
        l.address?.state || l.address?.province
      ].filter(Boolean).join(' ');

      // Price formatting
      const price = l.listPrice || l.price || 0;
      const formattedPrice = price
        ? '$' + Number(price).toLocaleString('en-US')
        : 'Price on Request';

      return {
        address: address || 'Address not available',
        price: formattedPrice,
        beds: l.details?.numBedrooms || l.bedrooms || 'N/A',
        baths: l.details?.numBathrooms || l.bathrooms || 'N/A',
        sqft: l.details?.sqft || l.details?.approximateSquareFootage || 'N/A',
        type: l.type || l.propertyType || 'House',
        photo: photo,
        mlsNum: l.mlsNumber || l.mls || '',
        url: l.url || (l.mlsNumber ? `https://www.realtor.ca/real-estate/${l.mlsNumber}` : ''),
        description: l.remarks || l.publicRemarks || ''
      };
    });

    return Response.json({
      total: data.count || rawListings.length,
      listings
    });

  } catch (err) {
    console.error('Repliers route error:', err);
    return Response.json({ error: err.message, listings: [] }, { status: 500 });
  }
}
