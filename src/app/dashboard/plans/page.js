'use client';
import { useState } from 'react';
import { Check, Zap, Shield, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlansPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for simple websites and basic chatbot needs.',
      monthlyPrice: '49',
      yearlyPrice: '39',
      icon: <Star size={24} color="#818CF8" />,
      features: [
        '1 AI Chatbot',
        'Standard Website Scraping',
        'Basic Analytics & Lead Capture',
        'Standard Support'
      ],
      buttonText: 'Current Plan',
      isCurrent: true,
      popular: false
    },
    {
      name: 'Pro',
      description: 'Advanced AI features for Real Estate and E-commerce.',
      monthlyPrice: '79',
      yearlyPrice: '65',
      icon: <Zap size={24} color="#FBBF24" />,
      features: [
        '1 AI Chatbot',
        'Real Estate Listings Scraping',
        'E-commerce Product Syncing',
        'Advanced CRM Lead Mapping',
        'Live Human Takeover',
        'Priority WhatsApp Support'
      ],
      buttonText: 'Upgrade to Pro',
      isCurrent: false,
      popular: true
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Subscription Plans</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px', margin: '0 auto 32px' }}>
          Choose the perfect plan for your business. Upgrade anytime as your operations grow.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {plans.map((plan, index) => (
          <motion.div 
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel"
            style={{ 
              padding: '32px', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column',
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
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
              <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>/ month</span>
            </div>
            
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
              <button style={{ 
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                background: plan.isCurrent ? 'rgba(255,255,255,0.05)' : plan.popular ? 'linear-gradient(90deg, #818CF8, #4F46E5)' : 'white',
                color: plan.isCurrent ? 'var(--text-muted)' : plan.popular ? 'white' : 'black',
                border: plan.isCurrent ? '1px solid var(--border)' : 'none'
              }}>
                {plan.buttonText}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
