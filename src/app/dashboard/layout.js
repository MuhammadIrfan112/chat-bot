'use client';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Inactive');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthAndSub = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email);
        const { data: sub } = await supabase
          .from('users_subscription')
          .select('status')
          .eq('user_id', session.user.id)
          .single();
        if (sub) {
          setSubscriptionStatus(sub.status);
        } else {
          // New user: automatically start 15-day free trial
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

    // AUTO SIGNOUT check
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: sub, error } = await supabase
        .from('users_subscription')
        .select('user_id')
        .eq('user_id', session.user.id)
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
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { name: 'My Chatbots', path: '/dashboard/chatbots', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg> },
    { name: 'Knowledge Base', path: '/dashboard/knowledge', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> },
    { name: 'CRM Leads', path: '/dashboard/leads', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { name: 'Live Chat', path: '/dashboard/livechat', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> },
  ];

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      {/* Dark Sidebar */}
      <aside style={{ width: '260px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column', color: '#F8FAFC' }}>
        
        {/* Logo Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', borderBottom: '1px solid var(--border-dark)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '4px', display: 'flex' }}>
            <img src="/logo-icon.png" alt="BotFlow AI Icon" style={{ height: '24px', width: '24px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>BotFlow AI</h2>
        </div>
        
        {/* Navigation */}
        <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>Menu</div>
          
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} onClick={() => setIsSidebarOpen(false)} style={{ 
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', 
                color: isActive ? 'white' : 'var(--text-muted)', 
                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent', 
                textDecoration: 'none', transition: 'all 0.2s', fontWeight: isActive ? '600' : '500',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                <span style={{ color: isActive ? 'var(--primary)' : 'inherit' }}>{item.icon}</span>
                <span style={{ fontSize: '14px' }}>{item.name}</span>
              </Link>
            )
          })}
          
          <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-dark)' }}></div>
          
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>Settings</div>
          
          <Link href="/dashboard/billing" onClick={() => setIsSidebarOpen(false)} style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', 
            color: pathname.includes('/dashboard/billing') ? 'white' : 'var(--text-muted)', 
            backgroundColor: pathname.includes('/dashboard/billing') ? 'rgba(99, 102, 241, 0.1)' : 'transparent', 
            textDecoration: 'none', transition: 'all 0.2s', fontWeight: pathname.includes('/dashboard/billing') ? '600' : '500',
            borderLeft: pathname.includes('/dashboard/billing') ? '3px solid var(--primary)' : '3px solid transparent'
          }}
          onMouseEnter={(e) => { if (!pathname.includes('/dashboard/billing')) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
          onMouseLeave={(e) => { if (!pathname.includes('/dashboard/billing')) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
          >
            <span style={{ color: pathname.includes('/dashboard/billing') ? 'var(--primary)' : 'inherit' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </span>
            <span style={{ fontSize: '14px' }}>Billing & Plans</span>
          </Link>
        </div>

        {/* User Profile Area */}
        <div style={{ padding: '20px 16px', borderTop: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userEmail || 'Admin User'}</div>
              <div style={{ fontSize: '11px', color: 'var(--success)' }}>Active Workspace</div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            title="Sign Out"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
