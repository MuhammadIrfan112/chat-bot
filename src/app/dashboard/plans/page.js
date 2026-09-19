'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Check, Zap, Clock, Crown, CalendarDays, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlansPage() {
  const [subData, setSubData] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

      const { data: sub } = await supabase
        .from('users_subscription')
        .select('status, trial_ends_at, plan, billing_cycle, created_at, updated_at')
        .eq('user_id', userId)
        .single();
      if (sub) setSubData(sub);

      const { data: history } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setBillingHistory(history || []);
      setLoadingHistory(false);
    };
    load();
  }, []);

  const handleSubscribe = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPayError('Please login first.'); setPaying(false); return; }
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail: session.user.email }),
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

  // Trial/Plan status
  const trialDaysLeft = subData?.trial_ends_at
    ? Math.ceil((new Date(subData.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isActive = subData?.status === 'Active';
  const isTrialing = subData?.status === 'Trialing';
  const isExpired = subData?.status === 'Inactive' || (trialDaysLeft !== null && trialDaysLeft <= 0 && !isActive);
  const isEndingSoon = !isExpired && trialDaysLeft !== null && trialDaysLeft <= 7;
  const planEndDate = subData?.trial_ends_at
    ? new Date(subData.trial_ends_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // Build unified history
  const allHistory = [...billingHistory];
  if (subData?.status) {
    const hasCurrent = allHistory.some(h => h.status === 'Active' || h.status === 'Trialing');
    if (!hasCurrent) {
      const isTrial = subData.status === 'Trialing';
      allHistory.unshift({
        id: 'current-active-sub',
        plan: 'PropFlow AI',
        amount: isTrial ? 'Free Trial' : '$99/mo',
        billing_cycle: 'monthly',
        start_date: subData.created_at || subData.updated_at,
        end_date: subData.trial_ends_at,
        status: subData.status,
        is_current: true,
      });
    }
  }

  const features = [
    '1 AI Real Estate Chatbot',
    'Live Property Listings (Zillow + Realtor.ca)',
    'Lead Capture & Qualification (Hot/Warm/Cold)',
    'Full Agent Dashboard',
    'Calendar & Appointment Management',
    'Live Chat Takeover',
    'Custom Branding & Colors',
    'USA + Canada Markets',
    'Website Embed (Any Platform)',
    'Knowledge Base Upload',
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>
          💳 Plans &amp; Billing History
        </h1>
        <p style={{ color: '#94A3B8', marginTop: '4px', fontSize: '14px' }}>
          View your active plan, subscription dates, and complete payment history.
        </p>
      </div>

      {/* Status Banners */}
      <AnimatePresence>
        {isExpired && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px' }}>🔒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>⛔ Your plan has ended — Upgrade to continue</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Your chatbot is currently paused. Subscribe below to reactivate it instantly.</div>
            </div>
            <a href="#subscribe" style={{ background: '#EF4444', color: 'white', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Subscribe Now</a>
          </motion.div>
        )}
        {isEndingSoon && !isExpired && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>Your {isTrialing ? 'free trial' : 'plan'} ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Subscribe before {planEndDate} to avoid any interruption.</div>
            </div>
            <a href="#subscribe" style={{ background: '#F59E0B', color: '#000', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Subscribe</a>
          </motion.div>
        )}
        {isActive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ShieldCheck size={28} color="#10B981" />
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>✅ Active Subscription</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Your PropFlow AI chatbot is live and running.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Billing History Table */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <CreditCard size={22} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Subscription &amp; Payment History</h2>
        </div>
        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : allHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>No billing records yet</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Your subscription and payment records will appear here.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  {['Plan', 'Amount', 'Billing', 'Start Date', 'Renews / Ends On', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allHistory.map((row, i) => {
                  const isRowActive = row.status === 'Active' || (row.status === 'Trialing' && (!row.end_date || new Date(row.end_date) > new Date()));
                  return (
                    <motion.tr key={row.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ background: isRowActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: isRowActive ? '1px solid rgba(99,102,241,0.25)' : 'none' }}>
                      <td style={{ padding: '14px 16px', borderRadius: '12px 0 0 12px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                        👑 {row.plan || 'PropFlow AI'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{row.amount || '$99/mo'}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>{row.billing_cycle || 'monthly'}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarDays size={13} />
                          {row.start_date ? new Date(row.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarDays size={13} />
                          {row.end_date ? new Date(row.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', borderRadius: '0 12px 12px 0' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', backgroundColor: isRowActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', color: isRowActive ? '#10B981' : '#EF4444', border: `1px solid ${isRowActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
                          {isRowActive ? '✅ Active' : '⏹ Expired'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscribe Section */}
      <div id="subscribe" style={{ marginTop: '50px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
            {isActive ? '🔄 Manage Your Plan' : '🚀 Get Started with PropFlow AI'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '560px', margin: '0 auto' }}>
            {isActive ? 'Your chatbot is live. Manage your subscription via Paddle.' : 'One simple plan. Everything you need to generate leads with AI.'}
          </p>
        </div>

        {payError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', color: '#FCA5A5', textAlign: 'center' }}>
            {payError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel"
            style={{ padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '440px', border: '2px solid var(--primary)', position: 'relative' }}>

            {/* Popular badge */}
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '4px 20px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              🏆 PropFlow AI — Full Access
            </div>

            {/* Price */}
            <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                <span style={{ fontSize: '56px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>$99</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: '500' }}>/month</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                Billed monthly via Paddle • Cancel anytime
              </div>
            </div>

            {/* Features */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <Check size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={handleSubscribe}
              disabled={paying}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px', fontWeight: '800',
                cursor: paying ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                background: paying ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #818CF8, #4F46E5)',
                color: paying ? 'var(--text-muted)' : 'white', border: 'none',
                boxShadow: paying ? 'none' : '0 8px 25px rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {paying
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                : isActive
                  ? '🔄 Manage Subscription'
                  : '🚀 Subscribe via Paddle — $99/mo'
              }
            </button>

            {/* Trust line */}
            <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              🔒 Secure payment via Paddle
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
