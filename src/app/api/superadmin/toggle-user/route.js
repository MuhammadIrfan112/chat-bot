import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return Response.json({ error: 'userId and status are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users_subscription')
      .update({ status })
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error toggling user status:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
