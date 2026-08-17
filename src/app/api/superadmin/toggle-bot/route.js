import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { botId, status } = await req.json();

    if (!botId || !status) {
      return Response.json({ error: 'botId and status are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('bots')
      .update({ status })
      .eq('id', botId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error toggling bot status:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
