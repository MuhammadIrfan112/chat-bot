'use client';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Database, Users, Settings, CreditCard, LogOut, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Inactive');
  const [planName, setPlanName] = useState('');
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [impersonatedEmail, setImpersonatedEmail] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [websiteType, setWebsiteType] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthAndSub = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        const impEmail = localStorage.getItem('impersonated_user_email');
        if (impEmail) {
          setImpersonatedEmail(impEmail);
          setUserEmail(impEmail);
        } else {
          setUserEmail(session.user.email);
        }
        
        if (!session.user.user_metadata?.website_type) {
          setShowOnboarding(true);
        }
        const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
        
        const { data: rows } = await supabase
          .from('users_subscription')
          .select('status, trial_ends_at, plan')
          .eq('user_id', userId)
          .limit(1);
        const sub = rows?.[0];

        if (sub) {
          setSubscriptionStatus(sub.status);
          setPlanName(sub.plan || 'starter');
          if (sub.trial_ends_at) {
            const daysLeft = Math.ceil((new Date(sub.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
          } else {
            setTrialDaysLeft(0);
          }
        } else {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);
          await supabase.from('users_subscription').insert({
            user_id: userId,
            status: 'Trialing',
            plan: 'free',
            email: impEmail || session.user.email,
            trial_ends_at: trialEndsAt.toISOString()
          });
          setSubscriptionStatus('Trialing');
          setPlanName('free');
        }
        setLoading(false);
      }
    };
    checkAuthAndSub();

    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
      const { data: sub, error } = await supabase
        .from('users_subscription')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!sub || error) {
        await supabase.auth.signOut();
        router.push('/login');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border-light)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  const handleSaveWebsiteType = async () => {
    setOnboardingLoading(true);
    await supabase.auth.updateUser({ data: { website_type: websiteType } });
    setShowOnboarding(false);
    setOnboardingLoading(false);
  };

  if (showOnboarding) {
    return (
      <div className={inter.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', padding: '20px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>Welcome to RealtyPropFlow! 👋</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
            Before you start, please tell us what kind of website you have so we can set up your dashboard correctly.
          </p>
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Industry / Website Type</label>
            <select
              value={websiteType}
              onChange={(e) => setWebsiteType(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', color: websiteType ? 'white' : 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', outline: 'none' }}
            >
              <option value="" disabled style={{ color: '#888' }}>Select your website type</option>
              <option value="real-estate" style={{ color: 'black' }}>Real Estate</option>
              <option value="ecommerce" style={{ color: 'black' }}>E-commerce</option>
              <option value="other" style={{ color: 'black' }}>Other</option>
            </select>
          </div>
          <button
            onClick={handleSaveWebsiteType}
            disabled={onboardingLoading}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: onboardingLoading ? 'not-allowed' : 'pointer' }}
          >
            {onboardingLoading ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Chatbots', path: '/dashboard/chatbots', icon: <MessageSquare size={20} /> },
    { name: 'Knowledge Base', path: '/dashboard/knowledge', icon: <Database size={20} /> },
    { name: 'CRM Leads', path: '/dashboard/leads', icon: <Users size={20} /> },
    { name: 'Chat History', path: '/dashboard/chat-history', icon: <MessageSquare size={20} /> },
    { name: 'Plans & Billing', path: '/dashboard/plans', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      
      {/* Ultra Premium Sidebar */}
      <aside style={{ width: '280px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
        
        {/* Glow behind Sidebar */}
        <div style={{ position: 'absolute', top: '10%', left: '-50%', width: '100%', height: '50%', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }}></div>

        {/* Logo Area */}
        <div style={{ position: 'relative', zIndex: 1, padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '6px', display: 'flex', boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
            <img src="/logo-icon.png" alt="RealtyPropFlow AI Icon" style={{ height: '20px', width: '20px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>RealtyPropFlow<span style={{ color: 'var(--primary)' }}>.</span></h2>
        </div>
        
        {/* Navigation */}
        <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '12px', marginTop: '16px' }}>Main Menu</div>
          
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', 
                color: isActive ? 'white' : 'var(--text-secondary)', 
                backgroundColor: isActive ? 'rgba(255,255,255,0.03)' : 'transparent', 
                textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: isActive ? '600' : '500',
                border: isActive ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
              >
                {isActive && (
                  <motion.div layoutId="active-nav" style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: 'var(--primary)', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--primary)' }} />
                )}
                <span style={{ color: isActive ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center', zIndex: 1 }}>{item.icon}</span>
                <span style={{ fontSize: '14px', zIndex: 1 }}>{item.name}</span>
              </Link>
            )
          })}
          
          <div style={{ margin: '24px 0 8px', borderTop: '1px solid var(--border)' }}></div>
          
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '12px' }}>Settings</div>
          
          <Link href="/dashboard/settings" style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', 
            color: pathname.includes('/dashboard/settings') ? 'white' : 'var(--text-secondary)', 
            backgroundColor: pathname.includes('/dashboard/settings') ? 'rgba(255,255,255,0.03)' : 'transparent', 
            textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: pathname.includes('/dashboard/settings') ? '600' : '500',
            border: pathname.includes('/dashboard/settings') ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => { if (!pathname.includes('/dashboard/settings')) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; } }}
          onMouseLeave={(e) => { if (!pathname.includes('/dashboard/settings')) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
          >
            <span style={{ color: pathname.includes('/dashboard/settings') ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
              <Settings size={20} />
            </span>
            <span style={{ fontSize: '14px' }}>Workspace Settings</span>
          </Link>


        </div>

        {/* User Profile Area */}
        <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #818CF8, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '16px', flexShrink: 0, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userEmail || 'Admin User'}</div>
              <div style={{ fontSize: '12px', color: 'var(--success)' }}>Active Workspace</div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '48px 56px', overflowY: 'auto', position: 'relative' }}>
        {impersonatedEmail && (
          <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              You are impersonating {impersonatedEmail}
            </div>
            <button onClick={() => {
              localStorage.removeItem('impersonated_user_id');
              localStorage.removeItem('impersonated_user_email');
              window.location.href = '/superadmin';
            }} style={{ padding: '6px 12px', backgroundColor: '#92400E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Exit Impersonation
            </button>
          </div>
        )}

        {/* ⏰ Trial Countdown Banner */}
        {(subscriptionStatus !== 'Inactive' || trialDaysLeft !== null) && (
          <div style={{
            background: subscriptionStatus === 'Active' ? 'rgba(16,185,129,0.05)' : subscriptionStatus === 'Inactive' ? 'rgba(239,68,68,0.05)' : 'rgba(79,70,229,0.05)',
            border: `1px solid ${
              subscriptionStatus === 'Active' ? 'rgba(16,185,129,0.3)'
              : subscriptionStatus === 'Inactive' ? 'rgba(239,68,68,0.3)'
              : trialDaysLeft <= 3 ? 'rgba(239,68,68,0.3)'
              : trialDaysLeft <= 7 ? 'rgba(245,158,11,0.3)'
              : 'rgba(79,70,229,0.3)'
            }`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            boxShadow: subscriptionStatus === 'Inactive' ? '0 8px 25px rgba(239,68,68,0.15)' : subscriptionStatus === 'Active' ? '0 4px 15px rgba(16,185,129,0.1)' : '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0,
                background: subscriptionStatus === 'Active' ? 'rgba(16,185,129,0.2)' : subscriptionStatus === 'Inactive' ? 'rgba(239,68,68,0.2)' : trialDaysLeft <= 3 ? 'rgba(239,68,68,0.2)' : trialDaysLeft <= 7 ? 'rgba(245,158,11,0.2)' : 'rgba(79,70,229,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
              }}>
                {subscriptionStatus === 'Active' ? '🎉' : subscriptionStatus === 'Inactive' ? '🔒' : trialDaysLeft <= 3 ? '🔴' : trialDaysLeft <= 7 ? '🟡' : '🕐'}
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', marginBottom: '4px' }}>
                  {subscriptionStatus === 'Active'
                    ? `✅ ${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan Active`
                    : subscriptionStatus === 'Inactive'
                    ? '⛔ Your 15-day free trial has ended. Your chatbot is now paused.'
                    : trialDaysLeft === 0
                    ? '⛔ Last Day! Your trial ends today'
                    : trialDaysLeft === 1
                    ? '⚠️ Trial ends tomorrow — 1 day left!'
                    : `🗓️ Free Trial Active — ${trialDaysLeft} days remaining`
                  }
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                  {subscriptionStatus === 'Active'
                    ? 'Your chatbot is fully active and all features are unlocked.'
                    : subscriptionStatus === 'Inactive'
                    ? 'Your chatbot visitors are seeing a paused message. Purchase a plan below to reactivate instantly.'
                    : 'Upgrade now to ensure your chatbot never stops working for your visitors.'
                  }
                </div>
              </div>
            </div>
            {subscriptionStatus !== 'Active' && (
              <a href="/dashboard/plans" style={{
                padding: '12px 28px',
                background: subscriptionStatus === 'Inactive' || trialDaysLeft <= 3
                  ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                  : 'linear-gradient(135deg, #C9A227, #F59E0B)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {subscriptionStatus === 'Inactive' ? '🔓 Purchase a Plan' : '⚡ Upgrade Plan'}
              </a>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.05, pointerEvents: 'none' }}></div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

