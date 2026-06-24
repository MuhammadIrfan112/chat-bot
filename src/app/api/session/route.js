import { supabase } from '@/lib/supabaseClient';

// Create or get a chat session
export async function POST(req) {
  try {
    const { visitor_id, bot_id } = await req.json();

    // Check if session exists for this specific bot (or landing page if no bot_id)
    let query = supabase
      .from('chat_sessions')
      .select('*')
      .eq('visitor_id', visitor_id);
      
    if (bot_id) {
      query = query.eq('bot_id', bot_id);
    } else {
      query = query.is('bot_id', null);
    }

    const { data: existing } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return Response.json({ session: existing });
    }

    // Create new session
    const insertData = { visitor_id, is_human_takeover: false };
    if (bot_id) insertData.bot_id = bot_id;

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ session: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
