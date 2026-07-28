import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || '';
  const beds = parseInt(searchParams.get('beds') || '0');

  let query = supabaseAdmin
    .from('properties')
    .select('mls_number, price, address, city, province, bedrooms, bathrooms, property_type, image_url, url')
    .order('created_at', { ascending: false })
    .limit(6);

  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query;
  if (error) return Response.json({ properties: [] });

  let properties = data || [];
  if (beds > 0) {
    const filtered = properties.filter(p => parseInt(p.bedrooms) >= beds);
    if (filtered.length > 0) properties = filtered;
  }

  return Response.json({ properties: properties.slice(0, 6) });
}
