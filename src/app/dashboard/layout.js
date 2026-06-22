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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthAndSub = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
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

    // ✅ AUTO SIGNOUT: Check every 30 seconds if user was deleted by admin
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Session ended - redirect to login
        router.push('/login');
        return;
      }
      // Check if user still exists in users_subscription
      const { data: sub, error } = await supabase
        .from('users_subscription')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();

      if (!sub || error) {
        // User was deleted by admin - force signout
        await supabase.auth.signOut();
        router.push('/login');
      }
    }, 30000); // every 30 seconds

    return () => clearInterval(interval);
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Dashboard...</div>;
  }

  return (
    <div className={inter.className} style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB', color: '#111827' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#4F46E5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>S</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>SaaS Admin</h2>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname === '/dashboard' ? 'white' : '#9CA3AF', backgroundColor: pathname === '/dashboard' ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>📊</span> Overview
          </Link>
          <Link href="/dashboard/chatbots" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname.includes('/dashboard/chatbots') ? 'white' : '#9CA3AF', backgroundColor: pathname.includes('/dashboard/chatbots') ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>🤖</span> My Chatbots
          </Link>
          <Link href="/dashboard/knowledge" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname.includes('/dashboard/knowledge') ? 'white' : '#9CA3AF', backgroundColor: pathname.includes('/dashboard/knowledge') ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>🧠</span> AI Knowledge Base
          </Link>
          <Link href="/dashboard/leads" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname.includes('/dashboard/leads') ? 'white' : '#9CA3AF', backgroundColor: pathname.includes('/dashboard/leads') ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>🎯</span> CRM Leads
          </Link>
          <Link href="/dashboard/livechat" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname.includes('/dashboard/livechat') ? 'white' : '#9CA3AF', backgroundColor: pathname.includes('/dashboard/livechat') ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>💬</span> Live Chat
          </Link>
          
          <div style={{ margin: '16px 0', borderTop: '1px solid #E5E7EB' }}></div>
          
          <Link href="/dashboard/billing" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: pathname.includes('/dashboard/billing') ? 'white' : '#9CA3AF', backgroundColor: pathname.includes('/dashboard/billing') ? '#4F46E5' : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>💳</span> Billing & Plans
          </Link>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
          <button 
            onClick={handleSignOut}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', fontWeight: '600', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px 0' }}>
            🚪 Sign Out
          </button>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Admin User</div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>Connected to Supabase ✅</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px' }}>
        {children}
      </main>
    </div>
  );
}
