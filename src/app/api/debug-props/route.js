import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Milton';
  const botId = searchParams.get('bot_id') || '';

  // Test 1: Can we reach supabase at all?
  const { data: allProps, error: allError } = await supabaseAdmin
    .from('properties')
    .select('mls_number, price, address, city, bedrooms, bathrooms, image_url, url')
    .limit(5);

  // Test 2: Can we filter by city?
  const { data: miltonProps, error: miltonError } = await supabaseAdmin
    .from('properties')
    .select('mls_number, price, address, city, bedrooms, bathrooms, image_url, url')
    .ilike('city', `%${city}%`)
    .limit(5);

  // Test 3: Simulate what fetchCityPropertyData returns
  let inventorySection = 'NOT CALLED';
  if (botId) {
    const { data: bot } = await supabaseAdmin.from('bots').select('name, industry').eq('id', botId).single();
    inventorySection = bot ? `Bot found: ${bot.name} / ${bot.industry}` : 'Bot NOT FOUND in DB';
  }

  return Response.json({
    allCount: allProps?.length || 0,
    allError: allError?.message || null,
    miltonCount: miltonProps?.length || 0,
    miltonError: miltonError?.message || null,
    botCheck: inventorySection,
    sample: miltonProps?.[0] || allProps?.[0] || null,
  });
}
