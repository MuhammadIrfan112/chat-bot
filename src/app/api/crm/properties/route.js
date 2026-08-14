import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bot_id = searchParams.get('bot_id');

  if (!bot_id) {
    return Response.json({ error: 'bot_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('properties')
    .select('*, agents(first_name, last_name)')
    .eq('bot_id', bot_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching properties:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ properties: data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bot_id, address, price, property_type, bedrooms, bathrooms, status, listing_agent_id } = body;

    if (!bot_id || !address) {
      return Response.json({ error: 'bot_id and address are required' }, { status: 400 });
    }

    // Prevent duplicates: Check if property with same address already exists for this bot
    const { data: existingProp, error: checkError } = await supabase
      .from('properties')
      .select('property_id')
      .ilike('address', address.trim())
      .eq('bot_id', bot_id)
      .single();

    if (existingProp) {
      return Response.json({ error: 'A property with this exact address already exists. Duplicate not allowed.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([{
        bot_id,
        address,
        price: price ? parseFloat(price) : null,
        property_type,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        status: status || 'Active',
        listing_agent_id: listing_agent_id || null
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ property: data });
  } catch (err) {
    console.error('Error adding property:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
