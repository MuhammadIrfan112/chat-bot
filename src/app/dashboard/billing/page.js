'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Billing() {
  const [status, setStatus] = useState('Loading...');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);

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

  const plans = [
    { 
      name: 'Standard', 
      price: '$29 /mo', 
      total: '$29', 
      features: ['1 Custom AI Chatbot', 'Unlimited Knowledge Training', 'Capture up to 100 Leads', 'Standard Support'] 
    },
    { 
      name: 'Pro', 
      price: '$79 /mo', 
      total: '$79', 
      features: ['1 Custom AI Chatbot', 'Unlimited Knowledge Training', 'Unlimited Leads Capture', 'Live Human Takeover', 'Remove Branding', 'Priority Support'],
      recommended: true
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Billing & Plans</h1>
          <p style={{ color: '#6B7280', marginTop: '4px' }}>Manage your subscription and payments.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ padding: '8px 16px', borderRadius: '50px', backgroundColor: status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: status === 'Active' ? '#065F46' : '#991B1B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status === 'Active' ? '🟢 Active Plan' : '🔴 Inactive (Payment Required)'}
          </div>
          {trialDaysLeft !== null && (
            <div style={{ fontSize: '12px', fontWeight: '600', color: trialDaysLeft <= 3 ? '#EF4444' : trialDaysLeft <= 7 ? '#F59E0B' : '#10B981' }}>
              {trialDaysLeft > 0 ? `⏰ Free Trial: ${trialDaysLeft} days remaining` : '⛔ Free Trial Expired — Please upgrade!'}
            </div>
          )}
        </div>
      </div>

      {/* $100 Professional Installation Service */}
      {!selectedPlan && (
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: '16px', padding: '28px 32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>⭐ Premium Add-On Service</div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 8px 0' }}>🚀 Professional Installation Service</h2>
            <p style={{ color: '#C7D2FE', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>We install & deploy your chatbot directly on your website — fully tested & live within 24 hours. Zero technical knowledge needed!</p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ color: '#A5B4FC', fontSize: '13px' }}>✅ We do everything for you</span>
              <span style={{ color: '#A5B4FC', fontSize: '13px' }}>✅ Live within 24 hours</span>
              <span style={{ color: '#A5B4FC', fontSize: '13px' }}>✅ One-time fee</span>
            </div>
          </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '900', color: 'white' }}>$100</div>
              <div style={{ color: '#A5B4FC', fontSize: '13px', marginBottom: '16px' }}>One-time payment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="https://wa.me/923000000000?text=Hi! I want the Professional Installation Service ($100) for my chatbot." target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#25D366', color: 'white', padding: '10px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
                  💬 Order via WhatsApp
                </a>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=irfangull2288@gmail.com&su=Order%3A%20Professional%20Installation%20Service%20(%24100)&body=Hi%2C%20I%20would%20like%20to%20order%20the%20chatbot%20Professional%20Installation%20Service%20(%24100).%0A%0APlease%20find%20my%20details%20below%3A%0A%0A1.%20My%20Website%20URL%3A%20%5BEnter%20your%20website%20link%5D%0A2.%20Website%20Platform%3A%20%5Be.g.%2C%20WordPress%2C%20Shopify%2C%20Wix%5D%0A%0A---%20Installation%20Access%20(Provide%20One)%20---%0AOption%20A%3A%20Website%20Admin%20Login%20(Temporary)%0AUsername%3A%20%5BEnter%20username%5D%0APassword%3A%20%5BEnter%20password%5D%0A%0AOption%20B%3A%20Google%20Tag%20Manager%0AI%20have%20invited%20irfangull2288%40gmail.com%20to%20my%20GTM.%0A%0AHow%20should%20I%20proceed%20with%20the%20payment%3F" target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#4F46E5', color: 'white', padding: '10px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                  📧 Order via Email
                </a>
              </div>
            </div>
        </div>
      )}

      {!selectedPlan ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
          {plans.map((plan, idx) => (
            <div key={idx} style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: plan.recommended ? '2px solid #4F46E5' : '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: plan.recommended ? '0 10px 25px rgba(79, 70, 229, 0.15)' : 'none' }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#4F46E5', color: 'white', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                  RECOMMENDED
                </div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: plan.recommended ? '#4F46E5' : '#111827', marginBottom: '8px' }}>{plan.name}</h3>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>{plan.total}</div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '32px' }}>billed monthly</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: '#4B5563', lineHeight: '2', flex: 1 }}>
                {plan.features.map((f, i) => <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#10B981' }}>✅</span> {f}</li>)}
              </ul>
              <button 
                onClick={() => setSelectedPlan(plan)}
                style={{ width: '100%', padding: '14px', backgroundColor: plan.recommended ? '#4F46E5' : '#F3F4F6', color: plan.recommended ? 'white' : '#111827', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s' }}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #E5E7EB', maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => setSelectedPlan(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← Back to Plans
          </button>
          
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', color: '#111827' }}>Manual Payment Instructions</h2>
          <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
            You have selected the <strong>{selectedPlan.name}</strong> plan for <strong>{selectedPlan.total}</strong>. To activate your chatbot, please send the payment to one of the accounts below:
          </p>

          <div style={{ backgroundColor: '#F8F9FF', padding: '20px', borderRadius: '12px', border: '1px solid #C7D2FE', marginBottom: '24px' }}>
            <h4 style={{ fontWeight: '700', color: '#4F46E5', marginBottom: '12px' }}>🏦 Local Bank Transfer (Pakistan)</h4>
            <div style={{ marginBottom: '4px' }}><strong>Bank Name:</strong> UBL (United Bank Limited)</div>
            <div style={{ marginBottom: '4px' }}><strong>Account Title:</strong> [Your Name Here]</div>
            <div><strong>IBAN / Account Number:</strong> 0000 0000 0000</div>
          </div>

          <div style={{ backgroundColor: '#FFFBEB', padding: '20px', borderRadius: '12px', border: '1px solid #FDE68A', marginBottom: '24px' }}>
            <h4 style={{ fontWeight: '700', color: '#D97706', marginBottom: '12px' }}>🌍 Payoneer (For International Clients)</h4>
            <div style={{ marginBottom: '4px' }}><strong>Payoneer Email:</strong> [your-email@example.com]</div>
            <div style={{ fontSize: '13px', color: '#92400E', marginTop: '8px' }}>* Perfect for clients in USA, UK, and Europe. Send payment directly to this Payoneer email.</div>
          </div>

          <div style={{ backgroundColor: '#F0FDF4', padding: '20px', borderRadius: '12px', border: '1px solid #BBF7D0', marginBottom: '24px' }}>
            <h4 style={{ fontWeight: '700', color: '#16A34A', marginBottom: '12px' }}>📱 SadaPay / JazzCash (Local Wallets)</h4>
            <div style={{ marginBottom: '4px' }}><strong>SadaPay Number:</strong> 0300 0000000</div>
            <div style={{ marginBottom: '4px' }}><strong>JazzCash Number:</strong> 0300 0000000</div>
            <div><strong>Account Title:</strong> [Your Name Here]</div>
          </div>

          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Step 2: Send Proof of Payment</h3>
            <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
              After sending the payment, please take a screenshot and send it to our official WhatsApp number. Please include your account email address and your Bot Name so we can activate your account instantly.
            </p>
            <a href="https://wa.me/923000000000" target="_blank" rel="noreferrer" style={{ display: 'inline-block', backgroundColor: '#25D366', color: 'white', padding: '16px 32px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '18px', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.3)' }}>
              💬 Send Screenshot on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
