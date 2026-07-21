'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const SUPERADMIN_PASSWORD = 'Superadmin#7795';
const SESSION_KEY = 'superadmin_auth';

export default function SuperAdminLayout({ children }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if already authed in this browser session
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === 'true') {
      setAuthed(true);
    }
    // Get logged-in user email for display
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserEmail(session.user.email);
      else router.push('/login');
      setLoading(false);
    });
  }, [router]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === SUPERADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', color: 'white' }}>
        Loading...
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <div style={{ background: '#1E293B', borderRadius: '16px', padding: '40px 48px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
            <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '800', margin: 0 }}>Super Admin Access</h1>
            <p style={{ color: '#94A3B8', marginTop: '8px', fontSize: '14px' }}>Enter the password to unlock the admin panel</p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94A3B8', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter super admin password..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#0F172A',
                  border: `1px solid ${error ? '#EF4444' : '#334155'}`,
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {error && <p style={{ color: '#EF4444', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px',
                background: 'linear-gradient(135deg, #C9A227, #F59E0B)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🔓 Unlock Super Admin
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/dashboard" style={{ color: '#4F46E5', fontSize: '13px', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
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

        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            href="/superadmin"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: '12px', color: 'white',
              backgroundColor: pathname === '/superadmin' ? '#4F46E5' : 'transparent',
              textDecoration: 'none', fontWeight: '500', fontSize: '14px'
            }}
          >
            <span style={{ fontSize: '18px' }}>👥</span> Manage Users
          </Link>

          <Link
            href="/superadmin/bulk-scrape"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: '12px', color: 'white',
              backgroundColor: pathname === '/superadmin/bulk-scrape' ? '#C9A227' : 'transparent',
              textDecoration: 'none', fontWeight: '500', fontSize: '14px'
            }}
          >
            <span style={{ fontSize: '18px' }}>🏙️</span> Ontario Bulk Scraper
          </Link>

          <button
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              localStorage.removeItem('impersonated_user_id');
              localStorage.removeItem('impersonated_user_email');
              window.location.href = '/dashboard';
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderRadius: '12px', color: '#9CA3AF', background: 'none',
              border: 'none', cursor: 'pointer', width: '100%', fontWeight: '500', fontSize: '14px'
            }}
          >
            <span style={{ fontSize: '18px' }}>↩️</span> Enter as Client
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <header style={{ backgroundColor: 'white', padding: '20px 40px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', color: '#1E293B' }}>{userEmail}</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              AD
            </div>
          </div>
        </header>

        <main style={{ padding: '40px', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
