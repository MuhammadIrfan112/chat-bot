import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase admin client with the service_role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return Response.json({ error: 'Missing stripe signature or secret' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return Response.json({ error: 'Webhook Error: ' + err.message }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      if (!metadata || !metadata.user_id) {
        console.error('No user_id found in session metadata', session.id);
        return Response.json({ error: 'Missing metadata' }, { status: 400 });
      }

      const { user_id, plan, cycle } = metadata;

      // Calculate new trial ends at based on cycle
      const trialEnd = new Date();
      if (cycle === 'yearly') {
        trialEnd.setFullYear(trialEnd.getFullYear() + 1);
      } else {
        // default to monthly
        trialEnd.setMonth(trialEnd.getMonth() + 1);
      }

      // Update Supabase subscription (Safe approach without relying on unique constraints)
      const { data: existingSub } = await supabaseAdmin
        .from('users_subscription')
        .select('id')
        .eq('user_id', user_id)
        .single();

      const payload = {
        status: 'Active',
        plan: plan || 'starter',
        trial_ends_at: trialEnd.toISOString(),
        updated_at: new Date().toISOString()
      };

      let dbError;
      if (existingSub) {
        const { error } = await supabaseAdmin
          .from('users_subscription')
          .update(payload)
          .eq('user_id', user_id);
        dbError = error;
      } else {
        const { error } = await supabaseAdmin
          .from('users_subscription')
          .insert({ user_id: user_id, ...payload });
        dbError = error;
      }

      if (dbError) {
        console.error('Error updating subscription in DB:', dbError);
        return Response.json({ error: 'Database update failed', details: dbError.message || dbError }, { status: 500 });
      }

      console.log(`Successfully activated subscription for user: ${user_id}`);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler failed:', err);
    return Response.json({ error: 'Internal Server Error', details: err.message, stack: err.stack }, { status: 500 });
  }
}
