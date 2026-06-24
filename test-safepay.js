const isSandbox = true;
const SAFEPAY_API_BASE = isSandbox
  ? 'https://sandbox.api.getsafepay.com'
  : 'https://api.getsafepay.com';

const plan = 'starter';
const cycle = 'monthly';
const userId = 'test-user-id';
const userEmail = 'test@botflow.ai';

const priceUSD = 49;
const priceInPKR = Math.round(priceUSD * 278);
const amountInPaisa = priceInPKR * 100;
const orderId = `botflow-${userId.slice(0,8)}-${plan}-${Date.now()}`;

const pubKey = 'sec_f632d818-b508-4d6d-b26d-976ea741daf0';
const secretKey = 'c901f9e6c3d668ed2558d858ec797a90931cc809438473fe8b49430544a13a0b';

async function test() {
    console.log("Sending request to Safepay...");
    const trackerRes = await fetch(`${SAFEPAY_API_BASE}/order/v1/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SFPY-MERCHANT-SECRET': secretKey,
      },
      body: JSON.stringify({
        merchant_api_key: pubKey,
        client: pubKey,
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
    console.log('Safepay tracker response:', JSON.stringify(trackerData, null, 2));
}

test().catch(console.error);
