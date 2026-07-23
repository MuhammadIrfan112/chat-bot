'use client';
import { useState, useEffect } from 'react';
import { Check, Zap, Star, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subStatus, setSubStatus] = useState(null);
  const [paying, setPaying] = useState(null); // plan being paid for
  const [payError, setPayError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from('users_subscription')
        .select('status')
        .eq('user_id', session.user.id)
        .single();
      if (data) setSubStatus(data.status);
    });
  }, []);

  const handleSelectPlan = async (planId, price) => {
    setPaying(planId);
    setPayError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPayError('Please login first.'); setPaying(null); return; }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
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
        setPaying(null);
      }
    } catch (err) {
      setPayError('Payment error. Please try again.');
      setPaying(null);
    }
  };

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for simple websites and basic chatbot needs.',
      monthlyPrice: '29',
      yearlyPrice: '24',
      icon: <Star size={24} color="#818CF8" />,
      features: [
        '1 AI Chatbot',
        'Standard Website Scraping',
        'Basic Analytics & Lead Capture',
        'Standard Support'
      ],
      popular: false,
      planId: 'starter'
    },
    {
      name: 'Pro',
      description: 'Advanced AI features for Real Estate and E-commerce.',
      monthlyPrice: '49',
      yearlyPrice: '39',
      icon: <Zap size={24} color="#FBBF24" />,
      features: [
        '1 AI Chatbot',
        'Real Estate Listings Scraping',
        'E-commerce Product Syncing',
        'Advanced CRM Lead Mapping',
        'Live Human Takeover',
        'Priority WhatsApp Support'
      ],
      popular: true,
      planId: 'pro'
    }
  ];

  const isExpired = subStatus === 'Inactive';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>

        {/* Trial Expired Alert */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '16px',
              padding: '20px 28px',
              marginBottom: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              boxShadow: '0 8px 25px rgba(239,68,68,0.12)'
            }}
          >
            <div style={{ fontSize: '36px', flexShrink: 0 }}>🔒</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: 'white', marginBottom: '6px' }}>
                ⛔ Your 15-day free trial has ended
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.5' }}>
                Your chatbot is currently paused. Select a plan below to reactivate it instantly for your website visitors.
              </div>
            </div>
          </motion.div>
        )}

        <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {isExpired ? 'Reactivate Your Chatbot' : 'Subscription Plans'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 32px' }}>
          {isExpired
            ? 'Choose a plan below to get your chatbot back online immediately.'
            : 'Choose the perfect plan for your business. Upgrade anytime as your operations grow.'
          }
        </p>

        {/* Billing Toggle */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '100px', padding: '4px' }}>
          <button 
            onClick={() => setBillingCycle('monthly')}
            style={{ 
              padding: '8px 24px', borderRadius: '100px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
              background: billingCycle === 'monthly' ? 'var(--primary)' : 'transparent',
              color: billingCycle === 'monthly' ? 'white' : 'var(--text-secondary)'
            }}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('yearly')}
            style={{ 
              padding: '8px 24px', borderRadius: '100px', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
              background: billingCycle === 'yearly' ? 'var(--primary)' : 'transparent',
              color: billingCycle === 'yearly' ? 'white' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            Yearly <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>Save 20%</span>
          </button>
        </div>
      </div>

      {payError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '24px', color: '#FCA5A5', textAlign: 'center' }}>
          {payError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
        {plans.map((plan, index) => (
          <motion.div 
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel"
            style={{ 
              padding: '32px', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '380px',
              border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--border)',
              transform: plan.popular ? 'scale(1.02)' : 'scale(1)',
              zIndex: plan.popular ? 2 : 1
            }}
          >
            {plan.popular && (
              <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', padding: '4px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Most Popular
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                {plan.icon}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{plan.name}</h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', minHeight: '40px' }}>{plan.description}</p>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: billingCycle === 'yearly' ? '8px' : '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>/ month</span>
            </div>
            {billingCycle === 'yearly' && (
              <div style={{ marginBottom: '32px', fontSize: '13px', color: 'rgba(99,102,241,0.9)', fontWeight: '600', background: 'rgba(99,102,241,0.1)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block' }}>
                Billed ${plan.yearlyPrice * 12}/year — Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12}/year
              </div>
            )}
            
            <div style={{ borderTop: '1px solid var(--border)', margin: '0 -32px 32px', padding: '32px 32px 0' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {plan.features.map(feature => (
                  <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Check size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{ marginTop: 'auto' }}>
              <button 
                disabled={paying === plan.planId}
                onClick={() => handleSelectPlan(plan.planId, billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                style={{ 
                  width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: paying === plan.planId ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  background: paying === plan.planId ? 'rgba(255,255,255,0.05)' : plan.popular
                    ? 'linear-gradient(90deg, #818CF8, #4F46E5)'
                    : isExpired ? 'linear-gradient(90deg, #EF4444, #DC2626)' : 'white',
                  color: paying === plan.planId ? 'var(--text-muted)' : plan.popular ? 'white' : isExpired ? 'white' : 'black',
                  border: 'none',
                  opacity: paying && paying !== plan.planId ? 0.5 : 1
                }}
              >
                {paying === plan.planId ? '⏳ Processing...' : isExpired ? `🔓 Reactivate with ${plan.name}` : `Get ${plan.name}`}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
