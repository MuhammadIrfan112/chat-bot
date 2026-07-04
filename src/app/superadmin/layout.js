'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminLayout({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUserEmail(session.user.email);

      // Check role in users_subscription
      const { data: sub } = await supabase
        .from('users_subscription')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (sub && sub.role === 'superadmin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', color: 'white' }}>Loading Super Admin Panel...</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <h1 style={{ fontSize: '24px', color: '#DC2626', marginBottom: '16px' }}>Access Denied</h1>
        <p style={{ color: '#4B5563', marginBottom: '24px' }}>You do not have permission to view this page.</p>
        <Link href="/dashboard" style={{ padding: '10px 20px', backgroundColor: '#4F46E5', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600' }}>
          Go to Client Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', backgroundColor: '#0F172A', color: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1E293B' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Super Admin</h2>
          </div>
        </div>
        
        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/superadmin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: 'white', backgroundColor: pathname === '/superadmin' ? '#4F46E5' : 'transparent', textDecoration: 'none', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>👥</span> Manage Users
          </Link>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', color: '#9CA3AF', textDecoration: 'none', fontWeight: '500' }}>
            <span style={{ fontSize: '18px' }}>↩️</span> Enter as Client
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <header style={{ backgroundColor: 'white', padding: '20px 40px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', color: '#1E293B' }}>{userEmail}</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AD</div>
          </div>
        </header>
        
        <main style={{ padding: '40px', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
