import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version or your preferred one
});

const PLAN_PRICES = {
  starter: { monthly: 29, yearly: 24 }, // Assuming yearly means $24 * 12 or just $24 as a placeholder. We will use what's defined here.
  pro: { monthly: 49, yearly: 39 }
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
    
    // Stripe expects amount in cents
    const amountInCents = Math.round(priceUSD * 100);

    // Dynamically get the current domain (works for localhost and live domains like realtypropflow.com)
    const origin = req.headers.get('origin') || req.headers.get('referer')?.slice(0, -1) || 'https://www.realtypropflow.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `RealtyPropFlow ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${cycle})`,
              description: `One-time payment for ${cycle} access.`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: userId,
        user_email: userEmail || '',
        plan: plan,
        cycle: cycle,
        price_usd: priceUSD
      },
      success_url: `${appUrl}/dashboard/billing/success?plan=${plan}&cycle=${cycle}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?plan=${plan}&cycle=${cycle}&cancelled=true`,
    });

    // Return the checkout URL to redirect the user
    return Response.json({ checkoutUrl: session.url });

  } catch (error) {
    console.error('Checkout API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

