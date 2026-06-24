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
      {selectedPlan && (
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
            {payError && <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '8px' }}>{payError}</div>}
            <button
              onClick={handlePayNow}
              disabled={paying}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                background: paying ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #10B981, #059669)',
                color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none',
                fontWeight: '700', fontSize: '16px', cursor: paying ? 'not-allowed' : 'pointer',
                boxShadow: paying ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)', transition: 'all 0.2s'
              }}
            >
              {paying ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><Lock size={18} /> Pay Now — ${price}</>}
            </button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>🔒 Secured by Safepay</div>
          </div>
        </motion.div>
      )}

      {/* Professional Installation Add-on (Only show if not upgrading a plan directly) */}
      {!selectedPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.2))', 
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '24px', padding: '32px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' 
        }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', display: 'inline-block', background: 'rgba(99, 102, 241, 0.15)', padding: '6px 14px', borderRadius: '100px' }}>
              ⭐ Premium Add-On
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: '800', margin: '0 0 12px 0' }}>Professional Installation Service</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: 0, lineHeight: '1.6', maxWidth: '500px' }}>
              We install & deploy your chatbot directly on your website. Fully tested & live within 24 hours. Zero technical knowledge needed from your side.
            </p>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', minWidth: '250px' }}>
            <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '8px' }}>$100</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>One-time payment</div>
            <a href="https://wa.me/923000000000" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', padding: '14px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}>
              <Send size={16} /> Order Service
            </a>
          </div>
        </motion.div>
      )}

      {/* Manual Payment Section */}
      <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        Payment Methods <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--border)', padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Manual Options</span>
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Bank Transfer */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}><Building2 size={24} /></div>
            <div>
              <h4 style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>Local Bank Transfer</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pakistan only</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bank</span>
              <strong style={{ color: 'var(--text-primary)' }}>United Bank Limited (UBL)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Title</span>
              <strong style={{ color: 'var(--text-primary)' }}>Your Name Here</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>IBAN</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>PK00 UBL0 0000 0000</strong>
            </div>
          </div>
        </motion.div>

        {/* Payoneer */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderRadius: '12px' }}><Globe size={24} /></div>
            <div>
              <h4 style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>Payoneer</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>International Clients</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Send USD To Email</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>payments@botflow.ai</strong>
            </div>
            <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>
              For clients in USA, UK, and Europe. Send the exact USD amount to the email address above.
            </p>
          </div>
        </motion.div>

        {/* Mobile Wallets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px' }}><Smartphone size={24} /></div>
            <div>
              <h4 style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>Mobile Wallets</h4>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SadaPay / JazzCash</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>SadaPay</span>
              <strong style={{ color: 'var(--text-primary)' }}>0300 0000000</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>JazzCash</span>
              <strong style={{ color: 'var(--text-primary)' }}>0300 0000000</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Title</span>
              <strong style={{ color: 'var(--text-primary)' }}>Your Name</strong>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Verification Steps */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px dashed var(--primary)' }}>
        <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>Paid? Verify Your Account</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Take a screenshot of your transaction and send it to our WhatsApp team. {selectedPlan ? `Please mention that you are paying for the ${selectedPlan} plan.` : 'We will manually upgrade your account and activate your chatbots within 10 minutes.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href={`https://wa.me/923000000000${selectedPlan ? `?text=Hi, I have sent $${price} for the ${selectedPlan} plan (${billingCycle}). Here is my screenshot.` : ''}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#25D366', color: 'white', padding: '14px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)' }}>
            <Send size={18} /> Send Proof on WhatsApp
          </a>
        </div>
      </motion.div>

    </div>
  );
}
