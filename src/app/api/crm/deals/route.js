import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bot_id = searchParams.get('bot_id');

  if (!bot_id) {
    return Response.json({ error: 'bot_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      leads(name, email, phone),
      properties(address, price),
      agents(first_name, last_name)
    `)
    .eq('bot_id', bot_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ deals: data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bot_id, lead_id, property_id, agent_id, stage, contract_price, estimated_closing_date } = body;

    if (!bot_id || !lead_id) {
      return Response.json({ error: 'bot_id and lead_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('deals')
      .insert([{
        bot_id,
        lead_id,
        property_id: property_id || null,
        agent_id: agent_id || null,
        stage: stage || 'Lead',
        contract_price: contract_price ? parseFloat(contract_price) : null,
        estimated_closing_date: estimated_closing_date || null
      }])
      .select()
      .single();

    if (error) throw error;

    return Response.json({ deal: data });
  } catch (err) {
    console.error('Error adding deal:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
