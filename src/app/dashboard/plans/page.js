'use client';
import { useState, useEffect } from 'react';
import { Check, Zap, Star, Clock, AlertTriangle, Crown, CalendarDays, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subData, setSubData] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [paying, setPaying] = useState(null);
  const [payError, setPayError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

      const { data: sub } = await supabase
        .from('users_subscription')
        .select('status, trial_ends_at, plan, billing_cycle')
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

  const handleSelectPlan = async (planId, price) => {
    setPaying(planId);
    setPayError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPayError('Please login first.'); setPaying(null); return; }
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, cycle: billingCycle, userId, userEmail: session.user.email })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setPayError('Could not start payment. Please try again.');
        setPaying(null);
      }
    } catch (err) {
      setPayError('Payment error. Please try again.');
      setPaying(null);
    }
  };

  const plans = [
    {
      name: 'Standard',
      description: 'Lead capture only — no live property listings shown. Perfect for agents focused on qualifying leads.',
      monthlyPrice: '49', yearlyPrice: '42',
      icon: <Star size={24} color="#818CF8" />,
      features: ['1 AI Chatbot', 'Lead Capture Only', 'Standard Website Scraping', 'Basic Analytics', 'Standard Support'],
      popular: false, planId: 'starter'
    },
    {
      name: 'Premium',
      description: 'Shows live property listings to buyers, captures hot leads, and syncs real estate data.',
      monthlyPrice: '79', yearlyPrice: '69',
      icon: <Zap size={24} color="#FBBF24" />,
      features: ['1 AI Chatbot', 'Live Property Listings', 'Real Estate Listings Scraping', 'Data Sync from Realtor.ca', 'Advanced CRM Lead Mapping', 'Live Human Takeover'],
      popular: true, planId: 'pro'
    }
  ];

  // Trial/Plan status info
  const trialDaysLeft = subData?.trial_ends_at
    ? Math.ceil((new Date(subData.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isActive = subData?.status === 'Active';
  const isTrialing = subData?.status === 'Trialing';
  const isExpired = subData?.status === 'Inactive' || (trialDaysLeft !== null && trialDaysLeft <= 0 && !isActive);
  const isEndingSoon = !isExpired && trialDaysLeft !== null && trialDaysLeft <= 7;
  const currentPlanLabel = subData?.plan === 'pro' ? 'Premium' : subData?.plan === 'starter' ? 'Standard' : 'Trial';

  const planEndDate = subData?.trial_ends_at ? new Date(subData.trial_ends_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>

      {/* ── Current Plan Card ─────────────────────────────────── */}
      {subData && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          
          {/* Ending Soon / Expired Banner */}
          <AnimatePresence>
            {isExpired && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>⛔ Your plan has ended — Upgrade to continue</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Your chatbot is currently paused. Select a plan below to reactivate it instantly.</div>
                </div>
                <a href="#plans" style={{ background: '#EF4444', color: 'white', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade Now</a>
              </motion.div>
            )}
            {isEndingSoon && !isExpired && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '16px', padding: '18px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>Your {isTrialing ? 'free trial' : 'plan'} ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Upgrade before {planEndDate} to avoid any interruption to your chatbot service.</div>
                </div>
                <a href="#plans" style={{ background: '#F59E0B', color: '#000', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Upgrade</a>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Plan Summary Card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', background: isActive ? 'rgba(16,185,129,0.15)' : isTrialing ? 'rgba(99,102,241,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive ? <Crown size={26} color="#10B981" /> : isTrialing ? <Clock size={26} color="#818CF8" /> : <AlertTriangle size={26} color="#EF4444" />}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Current Plan</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {isTrialing ? '🎉 Free Trial' : currentPlanLabel}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Status: <span style={{ fontWeight: '700', color: isActive ? '#10B981' : isTrialing ? '#818CF8' : '#EF4444' }}>{isActive ? '✅ Active' : isTrialing ? '⏳ Trialing' : '🔴 Inactive'}</span>
                  {planEndDate && <> &nbsp;·&nbsp; {isExpired ? `Expired on ${planEndDate}` : `Renews / ends on ${planEndDate}`}</>}
                </div>
              </div>
            </div>
            {isTrialing && trialDaysLeft > 0 && (
              <div style={{ textAlign: 'center', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '12px 20px' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#818CF8', lineHeight: 1 }}>{trialDaysLeft}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>days left</div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Plans Section ─────────────────────────────────────── */}
      <div id="plans">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
            {isExpired ? 'Reactivate Your Chatbot' : 'Subscription Plans'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '560px', margin: '0 auto 28px' }}>
            {isExpired ? 'Choose a plan below to get your chatbot back online immediately.' : 'Choose the perfect plan for your business. Upgrade anytime.'}
          </p>
          {/* Billing Toggle */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '100px', padding: '4px' }}>
            <button onClick={() => setBillingCycle('monthly')} style={{ padding: '8px 24px', borderRadius: '100px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', background: billingCycle === 'monthly' ? 'var(--primary)' : 'transparent', color: billingCycle === 'monthly' ? 'white' : 'var(--text-secondary)' }}>Monthly</button>
            <button onClick={() => setBillingCycle('yearly')} style={{ padding: '8px 24px', borderRadius: '100px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', background: billingCycle === 'yearly' ? 'var(--primary)' : 'transparent', color: billingCycle === 'yearly' ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Yearly <span style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>Save 20%</span>
            </button>
          </div>
        </div>

        {payError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', color: '#FCA5A5', textAlign: 'center' }}>{payError}</div>}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {plans.map((plan, index) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="glass-panel"
              style={{ padding: '32px', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '380px', border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--border)', transform: plan.popular ? 'scale(1.02)' : 'scale(1)', zIndex: plan.popular ? 2 : 1 }}>
              {plan.popular && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '4px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Most Popular</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>{plan.icon}</div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{plan.name}</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', minHeight: '40px' }}>{plan.description}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: billingCycle === 'yearly' ? '8px' : '32px' }}>
                <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>/ month</span>
              </div>
              {billingCycle === 'yearly' && <div style={{ marginBottom: '32px', fontSize: '13px', color: 'rgba(99,102,241,0.9)', fontWeight: '600', background: 'rgba(99,102,241,0.1)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block' }}>Billed ${plan.yearlyPrice * 12}/year — Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year</div>}
              <div style={{ borderTop: '1px solid var(--border)', margin: '0 -32px 32px', padding: '32px 32px 0' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {plan.features.map(feature => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <Check size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} /><span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <button disabled={paying === plan.planId} onClick={() => handleSelectPlan(plan.planId, billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: paying === plan.planId ? 'not-allowed' : 'pointer', transition: 'all 0.2s', background: paying === plan.planId ? 'rgba(255,255,255,0.05)' : plan.popular ? 'linear-gradient(90deg, #818CF8, #4F46E5)' : isExpired ? 'linear-gradient(90deg, #EF4444, #DC2626)' : 'white', color: paying === plan.planId ? 'var(--text-muted)' : plan.popular ? 'white' : isExpired ? 'white' : 'black', border: 'none', opacity: paying && paying !== plan.planId ? 0.5 : 1 }}>
                  {paying === plan.planId ? '⏳ Processing...' : isExpired ? `🔓 Reactivate with ${plan.name}` : `Get ${plan.name}`}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Billing History ───────────────────────────────────── */}
      <div style={{ marginTop: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <CreditCard size={22} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Billing History</h2>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : billingHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>No billing records yet</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Your payment history will appear here after your first purchase.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  {['Plan', 'Amount', 'Billing', 'Start Date', 'End Date', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billingHistory.map((row, i) => {
                  const isRowActive = row.status === 'Active' && new Date(row.end_date) > new Date();
                  return (
                    <motion.tr key={row.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <td style={{ padding: '14px 16px', borderRadius: '12px 0 0 12px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                        {row.plan === 'premium' ? '👑 Premium' : '📦 Standard'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{row.amount || '—'}</td>
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
    </div>
  );
}
