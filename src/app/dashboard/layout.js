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
  const [userEmail, setUserEmail] = useState('');
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
        setUserEmail(session.user.email);
        
        if (!session.user.user_metadata?.website_type) {
          setShowOnboarding(true);
        }
        const { data: sub } = await supabase
          .from('users_subscription')
          .select('status, role')
          .eq('user_id', session.user.id)
          .single();
          
        if (sub?.role === 'superadmin') {
          router.push('/superadmin');
          return;
        }

        if (sub) {
          setSubscriptionStatus(sub.status);
        } else {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 15);
          await supabase.from('users_subscription').insert({
            user_id: session.user.id,
            status: 'Active',
            email: session.user.email,
            trial_ends_at: trialEndsAt.toISOString()
          });
          setSubscriptionStatus('Active');
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
      const { data: sub, error } = await supabase
        .from('users_subscription')
        .select('user_id, role')
        .eq('user_id', session.user.id)
        .single();

      if (!sub || error) {
        await supabase.auth.signOut();
        router.push('/login');
      } else if (sub.role === 'superadmin') {
        router.push('/superadmin');
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
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>Welcome to BotFlow! 👋</h2>
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
            <img src="/logo-icon.png" alt="BotFlow AI Icon" style={{ height: '20px', width: '20px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>BotFlow<span style={{ color: 'var(--primary)' }}>.</span></h2>
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

          <Link href="/dashboard/billing" style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', 
            color: pathname.includes('/dashboard/billing') ? 'white' : 'var(--text-secondary)', 
            backgroundColor: pathname.includes('/dashboard/billing') ? 'rgba(255,255,255,0.03)' : 'transparent', 
            textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: pathname.includes('/dashboard/billing') ? '600' : '500',
            border: pathname.includes('/dashboard/billing') ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => { if (!pathname.includes('/dashboard/billing')) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; } }}
          onMouseLeave={(e) => { if (!pathname.includes('/dashboard/billing')) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
          >
             {pathname.includes('/dashboard/billing') && (
                  <motion.div layoutId="active-nav" style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: 'var(--primary)', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--primary)' }} />
             )}
            <span style={{ color: pathname.includes('/dashboard/billing') ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
              <CreditCard size={20} />
            </span>
            <span style={{ fontSize: '14px' }}>Billing</span>
          </Link>

          <Link href="/dashboard/plans" style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', 
            color: pathname.includes('/dashboard/plans') ? 'white' : 'var(--text-secondary)', 
            backgroundColor: pathname.includes('/dashboard/plans') ? 'rgba(255,255,255,0.03)' : 'transparent', 
            textDecoration: 'none', transition: 'all 0.2s ease', fontWeight: pathname.includes('/dashboard/plans') ? '600' : '500',
            border: pathname.includes('/dashboard/plans') ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'
          }}
          onMouseEnter={(e) => { if (!pathname.includes('/dashboard/plans')) { e.currentTarget.style.color = 'white'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; } }}
          onMouseLeave={(e) => { if (!pathname.includes('/dashboard/plans')) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
          >
             {pathname.includes('/dashboard/plans') && (
                  <motion.div layoutId="active-nav" style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: '3px', background: 'var(--primary)', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px var(--primary)' }} />
             )}
            <span style={{ color: pathname.includes('/dashboard/plans') ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center' }}>
              <Zap size={20} />
            </span>
            <span style={{ fontSize: '14px' }}>Subscription Plans</span>
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
        <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.05, pointerEvents: 'none' }}></div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
