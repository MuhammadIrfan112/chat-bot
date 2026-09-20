// Paddle Checkout API — replaces Stripe
// Price ID: pri_01m2x0209ny42x6zkg03fpfmme ($99/month — PropFlow AI)

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_PRICE_ID = process.env.PADDLE_PRICE_ID || 'pri_01m2x0209ny42x6zkg03fpfmme';

export async function POST(req) {
  try {
    const { userId, userEmail } = await req.json();

    if (!userId) {
      return Response.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (!PADDLE_API_KEY) {
      return Response.json({ error: 'Paddle API key not configured' }, { status: 500 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get('origin') ||
      'https://www.realtypropflow.com';

    const isSandbox = PADDLE_API_KEY?.startsWith('pdl_sdb') || process.env.PADDLE_ENV === 'sandbox';
    const paddleBaseUrl = isSandbox
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com';

    // Create Paddle transaction (checkout session)
    const response = await fetch(`${paddleBaseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            price_id: PADDLE_PRICE_ID,
            quantity: 1,
          },
        ],
        customer: userEmail
          ? { email: userEmail }
          : undefined,
        custom_data: {
          user_id: userId,
          user_email: userEmail || '',
        },
        checkout: {
          url: `${appUrl}/dashboard/billing/success`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Paddle transaction error:', data);
      return Response.json(
        { error: data?.error?.detail || 'Paddle checkout failed' },
        { status: 500 }
      );
    }

    // Paddle returns checkout URL in data.data.checkout.url
    const checkoutUrl = data?.data?.checkout?.url;

    if (!checkoutUrl) {
      console.error('No checkout URL from Paddle:', data);
      return Response.json({ error: 'No checkout URL returned' }, { status: 500 });
    }

    const transactionId = data?.data?.id;

    return Response.json({ checkoutUrl, transactionId });
  } catch (error) {
    console.error('Checkout API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
