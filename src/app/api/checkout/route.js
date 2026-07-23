import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version or your preferred one
});

const PLAN_PRICES = {
  starter: { monthly: 69, yearly: 62 }, // 10% off: $69 * 0.9 = $62.1 → $62/month ($744/year)
  pro: { monthly: 99, yearly: 89 }      // 10% off: $99 * 0.9 = $89.1 → $89/month ($1068/year)
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

    // For yearly plans, charge the full annual amount (monthly equivalent × 12)
    const totalAmount = cycle === 'yearly' ? priceUSD * 12 : priceUSD;

    // Stripe expects amount in cents
    const amountInCents = Math.round(totalAmount * 100);

    // Always use live domain — fallback to realtypropflow.com
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin || 'https://www.realtypropflow.com';

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
              name: `RealtyPropFlow ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${cycle === 'yearly' ? 'Annual' : 'Monthly'})`,
              description: cycle === 'yearly'
                ? `Annual billing — $${priceUSD}/month × 12 months = $${totalAmount}/year`
                : `Monthly billing — $${priceUSD}/month`,
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
        price_usd: totalAmount
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

