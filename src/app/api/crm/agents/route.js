import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bot_id = searchParams.get('bot_id');

  if (!bot_id) {
    return Response.json({ error: 'bot_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('bot_id', bot_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ agents: data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bot_id, first_name, last_name, email, phone, office_id, assigned_zip_codes, price_range_min, price_range_max, languages_spoken, status } = body;

    if (!bot_id || !first_name || !last_name) {
      return Response.json({ error: 'bot_id, first_name, and last_name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agents')
      .insert([{
        bot_id,
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        office_id: office_id || null,
        assigned_zip_codes: assigned_zip_codes || [],
        price_range_min: price_range_min ? parseFloat(price_range_min) : null,
        price_range_max: price_range_max ? parseFloat(price_range_max) : null,
        languages_spoken: languages_spoken || [],
        status: status || 'Active'
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ agent: data });
  } catch (err) {
    console.error('Error adding agent:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
