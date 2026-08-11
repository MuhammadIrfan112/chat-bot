import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { userId, days = 15 } = await req.json();
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + days);

    const { error } = await supabase
      .from('users_subscription')
      .update({ trial_ends_at: newEnd.toISOString() })
      .eq('user_id', userId);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, trial_ends_at: newEnd.toISOString() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
