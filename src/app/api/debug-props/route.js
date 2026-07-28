import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Milton';

  // Test 1: Can we reach supabase at all?
  const { data: allProps, error: allError } = await supabaseAdmin
    .from('properties')
    .select('mls_number, price, address, city, bedrooms, bathrooms, image_url, url')
    .limit(5);

  // Test 2: Can we filter by Milton?
  const { data: miltonProps, error: miltonError } = await supabaseAdmin
    .from('properties')
    .select('mls_number, price, address, city, bedrooms, bathrooms, image_url, url')
    .ilike('city', `%${city}%`)
    .limit(5);

  return Response.json({
    allCount: allProps?.length || 0,
    allError: allError?.message || null,
    miltonCount: miltonProps?.length || 0,
    miltonError: miltonError?.message || null,
    sample: miltonProps?.[0] || allProps?.[0] || null,
  });
}
