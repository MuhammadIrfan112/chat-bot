import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const headersList = headers();
    const signature = headersList.get('x-sfpy-signature');
    const timestamp = headersList.get('x-sfpy-timestamp');

    // Webhook verification (only if secret is provided)
    const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature && timestamp) {
      const secret = Buffer.from(webhookSecret, 'base64');
      const payload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Safepay Webhook: Invalid signature');
        return Response.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      console.warn('Safepay Webhook: Bypassing signature verification (Missing secret or headers)');
    }

    const event = JSON.parse(rawBody);

    // Safepay webhook event structure
    if (event && event.type === 'payment.succeeded' && event.data) {
      const metadata = event.data.metadata;
      
      if (metadata && metadata.user_id) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);

        // Update the user's subscription
        const { error } = await supabase.from('users_subscription').upsert({
          user_id: metadata.user_id,
          status: 'Active',
          plan: metadata.plan || 'starter',
          billing_cycle: metadata.cycle || 'monthly',
          trial_ends_at: trialEnd.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        if (error) {
          console.error('Supabase update error:', error);
          return Response.json({ error: 'Database update failed' }, { status: 500 });
        }
        
        console.log(`Safepay Webhook: Successfully activated subscription for user ${metadata.user_id}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
