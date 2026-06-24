import { createClient } from '@supabase/supabase-js';

const isSandbox = process.env.SAFEPAY_ENV === 'sandbox';
const SAFEPAY_API_BASE = isSandbox
  ? 'https://sandbox.api.getsafepay.com'
  : 'https://api.getsafepay.com';
const SAFEPAY_CHECKOUT_BASE = isSandbox
  ? 'https://sandbox.getsafepay.com'
  : 'https://getsafepay.com';

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
    // Safepay uses PKR paisa (1 PKR = 100 paisa). $1 ≈ 278 PKR
    const priceInPKR = Math.round(priceUSD * 278);
    const amountInPaisa = priceInPKR * 100;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chat-bot-ruddy-one.vercel.app';
    const orderId = `botflow-${userId.slice(0,8)}-${plan}-${Date.now()}`;

    // Step 1: Create a payment tracker on Safepay
    const trackerRes = await fetch(`${SAFEPAY_API_BASE}/order/v1/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': process.env.SAFEPAY_SECRET_KEY,
      },
      body: JSON.stringify({
        merchant_api_key: process.env.SAFEPAY_PUBLISHABLE_KEY,
        client: process.env.SAFEPAY_PUBLISHABLE_KEY,
        environment: isSandbox ? 'sandbox' : 'production',
        intent: 'CYBERSOURCE',
        mode: 'payment',
        currency: 'PKR',
        amount: amountInPaisa,
        order_id: orderId,
        metadata: {
          user_id: userId,
          user_email: userEmail,
          plan,
          cycle,
          price_usd: priceUSD
        }
      }),
    });

    const trackerData = await trackerRes.json();
    console.log('Safepay tracker response:', JSON.stringify(trackerData));

    const token = trackerData?.data?.token;
    if (!trackerRes.ok || !token) {
      return Response.json({ error: 'Failed to create payment session', details: trackerData }, { status: 500 });
    }

    // Step 2: Build the hosted checkout URL
    const redirectUrl = encodeURIComponent(`${appUrl}/dashboard/billing/success?plan=${plan}&cycle=${cycle}`);
    const cancelUrl = encodeURIComponent(`${appUrl}/dashboard/billing?plan=${plan}&cycle=${cycle}&price=${priceUSD}&cancelled=true`);
    const checkoutUrl = `${SAFEPAY_API_BASE}/components?env=${isSandbox ? 'sandbox' : 'production'}&beacon=${token}&source=custom&redirect_url=${redirectUrl}&cancel_url=${cancelUrl}`;

    return Response.json({ checkoutUrl, token });

  } catch (error) {
    console.error('Checkout API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

