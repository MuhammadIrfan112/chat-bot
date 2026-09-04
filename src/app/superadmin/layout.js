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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email);
        if (session.user.email?.toLowerCase() === 'irfangull2288@gmail.com') {
          setAuthed(true);
          sessionStorage.setItem(SESSION_KEY, 'true');
        } else {
          const { data: rows } = await supabase
            .from('users_subscription')
            .select('role')
            .eq('user_id', session.user.id)
            .limit(1);
          if (rows?.[0]?.role === 'superadmin') {
            setAuthed(true);
            sessionStorage.setItem(SESSION_KEY, 'true');
          }
        }
      } else {
        router.push('/login');
      }
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <div style={{
        width: '270px',
        backgroundColor: '#0F172A',
        background: 'linear-gradient(180deg, #0B1329 0%, #0F172A 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        flexShrink: 0
      }}>
        {/* Brand Header */}
        <div style={{ padding: '24px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)'
            }}>
              🛡️
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>Super Admin</h2>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Control Center
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link
            href="/superadmin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              color: 'white',
              backgroundColor: pathname === '/superadmin' ? '#4F46E5' : 'rgba(255,255,255,0.04)',
              background: pathname === '/superadmin' ? 'linear-gradient(135deg, #4F46E5, #3B82F6)' : 'rgba(255,255,255,0.04)',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: pathname === '/superadmin' ? '0 4px 14px rgba(79,70,229,0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '18px' }}>👥</span>
            <span>Manage Users</span>
            <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
          </Link>
        </div>

        {/* User Info & Session Exit in Sidebar Bottom */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '800', fontSize: '13px'
            }}>
              AD
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail || 'Super Admin'}
              </div>
              <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Active Session
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Modern Header */}
        <header style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 36px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Admin Dashboard</span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '700' }}>Clients & Chatbots</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', background: '#F1F5F9', borderRadius: '20px',
              border: '1px solid #E2E8F0'
            }}>
              <span style={{ fontSize: '12px', color: '#334155', fontWeight: '700' }}>{userEmail}</span>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                AD
              </div>
            </div>
          </div>
        </header>

        <main style={{ padding: '36px', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
