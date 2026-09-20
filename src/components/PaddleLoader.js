'use client';
import { useEffect } from 'react';
import Script from 'next/script';

export default function PaddleLoader() {
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'test_1394f1978aa402a8211cee28183';
  const isSandbox = clientToken?.startsWith('test_') || process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';

  const initPaddle = () => {
    if (typeof window !== 'undefined' && window.Paddle) {
      try {
        if (isSandbox) {
          window.Paddle.Environment.set('sandbox');
        }
        window.Paddle.Initialize({
          token: clientToken,
          eventCallback: function (data) {
            console.log('Paddle event:', data);
            if (data.name === 'checkout.completed') {
              window.location.href = '/dashboard/billing/success';
            }
          }
        });
        console.log('✅ Paddle.js initialized successfully (environment:', isSandbox ? 'sandbox' : 'production', ')');
      } catch (err) {
        console.error('Paddle initialization error:', err);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Paddle) {
      initPaddle();
    }
  }, []);

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={initPaddle}
    />
  );
}
