import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const beds = parseInt(searchParams.get('beds') || '0');

  // Try city_property_data (Apify real data) first
  let cityQuery = supabaseAdmin.from('city_property_data').select('city, properties');
  if (city) cityQuery = cityQuery.ilike('city', `%${city}%`);
  const { data: cityRows } = await cityQuery.limit(5);

  let allProperties = [];
  if (cityRows && cityRows.length > 0) {
    cityRows.forEach(row => {
      if (row.properties && Array.isArray(row.properties)) {
        allProperties = allProperties.concat(row.properties);
      }
    });
  }

  // Fallback to old properties table if Apify data is empty
  if (allProperties.length === 0) {
    let query = supabaseAdmin
      .from('properties')
      .select('mls_number, price, address, city, province, bedrooms, bathrooms, property_type, image_url, url')
      .order('created_at', { ascending: false });

    if (city) query = query.ilike('city', `%${city}%`);
    query = query.limit(10);

    const { data, error } = await query;
    if (error) return Response.json({ properties: [] });

    let properties = data || [];
    if (beds > 0) {
      const filtered = properties.filter(p => parseInt(p.bedrooms) >= beds);
      if (filtered.length > 0) properties = filtered;
    }

    // Normalize to unified format with images array
    const normalized = properties.slice(0, 6).map(p => ({
      mls_number: p.mls_number,
      price: p.price,
      address: p.address,
      city: p.city,
      province: p.province,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      property_type: p.property_type,
      images: p.image_url ? [p.image_url] : [],
      image_url: p.image_url,
      url: p.url
    }));

    return Response.json({ properties: normalized });
  }

  // Filter by beds
  if (beds > 0) {
    const filtered = allProperties.filter(p => parseInt(p.bedrooms) >= beds);
    if (filtered.length > 0) allProperties = filtered;
  }

  // Normalize Apify format  
  const normalized = allProperties.slice(0, 6).map(p => ({
    mls_number: p.mls_number || p.mlsNumber || p.zpid || '',
    price: p.price || p.priceDisplay || 'Contact for Price',
    address: p.address || p.streetAddress || '',
    city: p.city || city,
    province: p.province || p.state || 'ON',
    bedrooms: p.bedrooms || p.beds || 'N/A',
    bathrooms: p.bathrooms || p.baths || 'N/A',
    property_type: p.property_type || p.propertyType || 'Residential',
    images: p.images && p.images.length > 0 ? p.images : (p.image_url ? [p.image_url] : (p.imgSrc ? [p.imgSrc] : [])),
    image_url: (p.images && p.images[0]) || p.image_url || p.imgSrc || '',
    url: p.url || ''
  }));

  return Response.json({ properties: normalized });
}
