import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SAFEPAY_BASE = process.env.SAFEPAY_ENV === 'sandbox'
  ? 'https://sandbox.api.getsafepay.com'
  : 'https://api.getsafepay.com';

const PLAN_PRICES = {
  starter: { monthly: 49, yearly: 39 },
  pro: { monthly: 79, yearly: 65 }
};

export async function POST(req) {
  try {
    const { plan, cycle, userId, userEmail } = await req.json();

    if (!plan || !cycle || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const planDetails = PLAN_PRICES[plan];
    if (!planDetails) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceUSD = planDetails[cycle];
    // Safepay uses PKR. Approx conversion: $1 = 278 PKR (update as needed)
    const priceInPKR = Math.round(priceUSD * 278);
    // Safepay amount is in "paisas" (PKR * 100)
    const amountInPaisas = priceInPKR * 100;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chat-bot-tau-one.vercel.app';

    // Step 1: Create a tracker (payment session) on Safepay
    const trackerRes = await fetch(`${SAFEPAY_BASE}/order/v1/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': process.env.SAFEPAY_SECRET_KEY,
      },
      body: JSON.stringify({
        merchant_api_key: process.env.SAFEPAY_PUBLISHABLE_KEY,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        currency: 'PKR',
        amount: amountInPaisas,
        order_id: `${userId}-${plan}-${cycle}-${Date.now()}`,
        metadata: {
          user_id: userId,
          user_email: userEmail,
          plan: plan,
          cycle: cycle,
          price_usd: priceUSD
        }
      }),
    });

    const trackerData = await trackerRes.json();

    if (!trackerRes.ok || !trackerData?.data?.tracker?.token) {
      console.error('Safepay tracker error:', trackerData);
      return Response.json({ error: 'Failed to create payment session', details: trackerData }, { status: 500 });
    }

    const token = trackerData.data.tracker.token;

    // Step 2: Build the hosted checkout URL
    const checkoutUrl = `${SAFEPAY_BASE === 'https://sandbox.api.getsafepay.com' ? 'https://sandbox.api.getsafepay.com' : 'https://api.getsafepay.com'}/embedded/${token}?beacon=${token}&source=custom&redirect_url=${encodeURIComponent(`${appUrl}/dashboard/billing/success?plan=${plan}&cycle=${cycle}`)}&cancel_url=${encodeURIComponent(`${appUrl}/dashboard/billing?cancelled=true`)}`;

    return Response.json({ checkoutUrl, token });

  } catch (error) {
    console.error('Checkout API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
