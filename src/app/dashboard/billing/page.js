'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShieldCheck, ShoppingCart, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Billing() {
  const [status, setStatus] = useState('Loading...');
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

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

  useEffect(() => {
    fetchStatus();
  }, []);

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
          userId: session.user.id,
          userEmail: session.user.email,
        })
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setPayError(data.error || 'Could not start payment. Please try again.');
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

      {/* Subscribe CTA */}
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ 
          background: 'rgba(99, 102, 241, 0.05)', border: '2px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '24px', padding: '40px', marginBottom: '40px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0' }}>PropFlow AI</h2>
          <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1, margin: '16px 0 4px' }}>$99<span style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: '500' }}>/month</span></div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>Billed monthly via Paddle • Cancel anytime</div>

          {payError && <div style={{ color: '#FCA5A5', fontSize: '14px', marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{payError}</div>}

          <button
            onClick={handlePayNow}
            disabled={paying}
            style={{
              display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              background: paying ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #818CF8, #4F46E5)',
              color: 'white', padding: '16px 40px', borderRadius: '14px', border: 'none',
              fontWeight: '800', fontSize: '17px', cursor: paying ? 'not-allowed' : 'pointer',
              boxShadow: paying ? 'none' : '0 8px 25px rgba(99, 102, 241, 0.4)', transition: 'all 0.2s'
            }}
          >
            {paying ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><Lock size={18} /> Subscribe via Paddle</>}
          </button>

          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '14px' }}>🔒 Secure payment processed by Paddle</div>
        </motion.div>
      </div>

      {/* Old empty state fallback */}
      {false && (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Choose a Plan</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Please select a plan to proceed with payment.</p>
          <a href="/dashboard/plans" style={{ background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>View Pricing Plans</a>
        </div>
      )}

    </div>
  );
}
