'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Globe, Smartphone, Send, ShieldCheck, ShoppingCart, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

export default function Billing() {
  const [status, setStatus] = useState('Loading...');
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const billingCycle = searchParams.get('cycle');
  const price = searchParams.get('price');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from('users_subscription')
        .select('status, trial_ends_at')
        .eq('user_id', session.user.id)
        .single();
      if (data) {
        setStatus(data.status);
        if (data.trial_ends_at) {
          const daysLeft = Math.ceil((new Date(data.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
        }
      } else {
        setStatus('Inactive');
      }
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPayError('Please login first.'); setPaying(false); return; }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          cycle: billingCycle,
          userId: session.user.id,
          userEmail: session.user.email
        })
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setPayError('Could not start payment. Please try again.');
        setPaying(false);
      }
    } catch (err) {
      setPayError('Payment error. Please try again.');
      setPaying(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Billing & Payments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: 0 }}>Manage your active subscription and payment methods.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ 
            padding: '8px 20px', borderRadius: '100px', 
            background: status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            color: status === 'Active' ? 'var(--success)' : 'var(--danger)', 
            border: status === 'Active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' 
          }}>
            {status === 'Active' ? <><ShieldCheck size={16} /> Active Plan</> : '🔴 Payment Required'}
          </div>
          {trialDaysLeft !== null && (
            <div style={{ fontSize: '13px', fontWeight: '600', color: trialDaysLeft <= 3 ? 'var(--danger)' : trialDaysLeft <= 7 ? '#F59E0B' : 'var(--success)' }}>
              {trialDaysLeft > 0 ? `Free Trial: ${trialDaysLeft} days remaining` : 'Free Trial Expired — Please upgrade'}
            </div>
          )}
        </div>
      </div>

      {/* Selected Plan Banner (if navigated from Plans) */}
      {selectedPlan ? (
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ 
            background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '24px', padding: '32px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '16px' }}>
                <ShoppingCart size={32} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Checkout Summary</div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '800', margin: 0, textTransform: 'capitalize' }}>
                  {selectedPlan} Plan ({billingCycle})
                </h2>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '8px' }}>${price} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>/ month</span></div>
            </div>
          </motion.div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)' }}>Select Payment Method</h3>
          {payError && <div style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{payError}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Safepay (Pakistan) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', border: '2px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Smartphone size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Pakistan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Pay securely via Debit/Credit Card, JazzCash, or EasyPaisa.</p>
              <button
                onClick={handlePayNow}
                disabled={paying}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  background: paying ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #10B981, #059669)',
                  color: 'white', padding: '14px', borderRadius: '12px', border: 'none',
                  fontWeight: '700', fontSize: '16px', cursor: paying ? 'not-allowed' : 'pointer',
                  boxShadow: paying ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s'
                }}
              >
                {paying ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><Lock size={18} /> Pay via Safepay</>}
              </button>
            </motion.div>

            {/* Stripe (International) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Globe size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>International</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Pay securely via Stripe (Visa, Mastercard, Amex, Apple Pay).</p>
              <button
                onClick={() => setPayError("Stripe integration is pending client keys.")}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  color: 'white', padding: '14px', borderRadius: '12px', border: 'none',
                  fontWeight: '700', fontSize: '16px', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', transition: 'all 0.2s'
                }}
              >
                <Lock size={18} /> Pay via Stripe
              </button>
            </motion.div>

          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Choose a Plan</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please select a plan to proceed with payment.</p>
          <a href="/dashboard/plans" style={{ background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>View Pricing Plans</a>
        </div>
      )}

    </div>
  );
}
