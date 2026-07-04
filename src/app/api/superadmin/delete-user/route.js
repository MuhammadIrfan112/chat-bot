import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service role client - can delete auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Step 1: Delete all bots belonging to this user
    await supabaseAdmin.from('bots').delete().eq('user_id', userId);

    // Step 2: Delete from users_subscription table
    await supabaseAdmin.from('users_subscription').delete().eq('user_id', userId);

    // Step 3: Delete from leads (if any)
    await supabaseAdmin.from('leads').delete().eq('user_id', userId);

    // Step 4: Delete from Supabase Auth (requires service role)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth delete error:', authError);
      return NextResponse.json({ error: 'Failed to delete auth user: ' + authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User and all data deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
