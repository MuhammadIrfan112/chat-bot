import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { userId, plan, cycle, note } = await req.json();
    if (!userId || !plan) {
      return Response.json({ error: 'userId and plan are required' }, { status: 400 });
    }

    const planLabel = plan === 'pro' ? 'premium' : 'standard';
    const amount = plan === 'pro'
      ? (cycle === 'yearly' ? '$69' : '$79')
      : (cycle === 'yearly' ? '$42' : '$49');

    const startDate = new Date();
    const endDate = new Date();
    if (cycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // 1. Update users_subscription
    const { error: subError } = await supabase
      .from('users_subscription')
      .update({
        status: 'Active',
        plan: plan,
        billing_cycle: cycle || 'monthly',
        trial_ends_at: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (subError) {
      console.error('Subscription update error:', subError);
      return Response.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // 2. Insert into billing_history
    const { error: historyError } = await supabase
      .from('billing_history')
      .insert({
        user_id: userId,
        plan: planLabel,
        billing_cycle: cycle || 'monthly',
        amount: amount,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'Active',
        assigned_by: 'admin',
        note: note || null
      });

    if (historyError) {
      console.error('Billing history insert error:', historyError);
    }

    // 3. Update all bots for this user to reflect plan
    await supabase
      .from('bots')
      .update({ plan: planLabel, status: 'Active' })
      .eq('user_id', userId);

    return Response.json({ success: true, plan: planLabel, endDate: endDate.toISOString() });
  } catch (err) {
    console.error('Assign plan error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
