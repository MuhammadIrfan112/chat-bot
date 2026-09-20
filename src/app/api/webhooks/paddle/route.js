import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const rawBody = await req.json();
    const eventType = rawBody?.event_type;
    const data = rawBody?.data;

    console.log(`[Paddle Webhook] Received event: ${eventType}`);

    if (
      eventType === 'subscription.activated' ||
      eventType === 'subscription.created' ||
      eventType === 'transaction.completed'
    ) {
      const customData = data?.custom_data || {};
      const userId = customData.user_id;

      if (userId) {
        const nextBilledAt = data?.next_billed_at || data?.billing_period?.ends_at;
        const endDate = nextBilledAt ? new Date(nextBilledAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 1. Update users_subscription
        await supabaseAdmin
          .from('users_subscription')
          .update({
            status: 'Active',
            plan: 'PropFlow AI',
            billing_cycle: 'monthly',
            trial_ends_at: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        // 2. Add to billing_history if transaction completed
        if (eventType === 'transaction.completed' || eventType === 'subscription.activated') {
          await supabaseAdmin
            .from('billing_history')
            .insert({
              user_id: userId,
              plan: 'PropFlow AI',
              billing_cycle: 'monthly',
              amount: '$99/mo',
              start_date: new Date().toISOString(),
              end_date: endDate.toISOString(),
              status: 'Active',
              note: `Paddle: ${data?.id || ''}`
            });

          // 3. Ensure bot exists in 'bots' table with Active status
          const { data: existingBots } = await supabaseAdmin
            .from('bots')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          if (!existingBots || existingBots.length === 0) {
            await supabaseAdmin
              .from('bots')
              .insert({
                user_id: userId,
                name: 'RealtyPropFlow AI',
                industry: 'Real Estate',
                primary_color: '#C9A227',
                status: 'Active',
                plan: 'PropFlow AI',
                welcome_message: 'Hi! Looking to buy, sell, or rent a property in the area?'
              });
          } else {
            await supabaseAdmin
              .from('bots')
              .update({ status: 'Active', plan: 'PropFlow AI' })
              .eq('id', existingBots[0].id);
          }
        }

        console.log(`[Paddle Webhook] Successfully activated subscription & bot for userId: ${userId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[Paddle Webhook Error]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
