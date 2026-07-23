'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  const [activating, setActivating] = useState(true);

  useEffect(() => {
    // The actual subscription update is now securely handled by the Stripe Webhook.
    // We just show a success message here.
    const timer = setTimeout(() => {
      setActivating(false);
    }, 2500); // Simulate brief processing time for UX
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel"
        style={{ padding: '64px', borderRadius: '32px', textAlign: 'center', maxWidth: '500px', border: '1px solid rgba(16, 185, 129, 0.3)' }}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}>
          <CheckCircle size={80} color="var(--success)" style={{ margin: '0 auto 24px' }} />
        </motion.div>

        <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Payment Successful! 🎉
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6', marginBottom: '12px' }}>
          Your <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{plan} Plan</strong> ({cycle}) has been activated.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px' }}>
          {activating ? 'Activating your account...' : 'Your account is now fully active. All features are unlocked.'}
        </p>

        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white',
            padding: '16px 32px', borderRadius: '12px', border: 'none', fontWeight: '700',
            fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)'
          }}
        >
          Go to Dashboard <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
}
