import { supabase } from '@/lib/supabaseClient';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');

    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });

    const fetchHistory = searchParams.get('fetch_history') === 'true';

    // Get session status
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('is_human_takeover')
      .eq('id', session_id)
      .single();

    let messages = [];

    if (fetchHistory) {
      // Get all messages to restore chat history
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });
      messages = data || [];
    } else {
      // Get admin messages only for polling
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session_id)
        .eq('role', 'admin')
        .order('created_at', { ascending: true });
      messages = data || [];
    }

    return Response.json({
      new_messages: !fetchHistory ? messages : [],
      history: fetchHistory ? messages : [],
      is_human_takeover: session?.is_human_takeover || false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
