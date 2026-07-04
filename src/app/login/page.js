'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronLeft } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [websiteType, setWebsiteType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { website_type: websiteType }
        }
      });
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      // If signup is successful, also create a default subscription row
      if (!isLogin && result.data?.user) {
        await supabase.from('users_subscription').insert({
          user_id: result.data.user.id,
          status: 'Inactive', // They must pay to activate
          email: email
        });
        router.push('/dashboard');
      } else {
        // Login success - check role to redirect correctly
        const { data: rows } = await supabase.from('users_subscription').select('role').eq('user_id', result.data.user.id).limit(1);
        const sub = rows?.[0];
        if (sub?.role === 'superadmin') {
          router.push('/superadmin');
        } else {
          router.push('/dashboard');
        }
      }
    }
  };

  const handleOAuth = async (provider) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-page)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Absolute Header for Back Button */}
      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <ChevronLeft size={20} />
          Back to Home
        </Link>
      </div>

      {/* Left Side: Branding / Gradient Panel */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '60px', color: 'white', justifyContent: 'center' }}>
        
        {/* Dynamic Abstract Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 0% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
        
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto' }}>
          <Link href="/">
            <img src="/logo.png" alt="BotFlow AI" style={{ height: '48px', filter: 'brightness(0) invert(1)', marginBottom: '40px' }} />
          </Link>
          <h1 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.2', marginBottom: '24px', letterSpacing: '-0.04em' }}>
            Automate your growth. <br />
            <span className="text-gradient-primary">24/7.</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Join thousands of modern businesses using BotFlow AI to capture leads, support customers, and scale operations effortlessly.
          </p>
        </motion.div>
      </div>

      {/* Right Side: Auth Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative' }}>
        
        <div style={{ position: 'absolute', top: '50%', right: '50%', transform: 'translate(50%, -50%)', width: '600px', height: '600px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }}></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', borderRadius: '24px', position: 'relative', zIndex: 1, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {isLogin ? 'Enter your details to access your workspace.' : 'Start automating your leads today.'}
            </p>
          </div>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                autoComplete="new-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', color: 'white', backgroundColor: 'rgba(255,255,255,0.03)', transition: 'all 0.2s', outline: 'none' }}
                placeholder="you@company.com"
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Password</label>
                {isLogin && (
                  <Link href="#" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>Forgot password?</Link>
                )}
              </div>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', color: 'white', backgroundColor: 'rgba(255,255,255,0.03)', transition: 'all 0.2s', outline: 'none' }}
                placeholder="••••••••"
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Industry / Website Type</label>
                <select
                  value={websiteType}
                  onChange={(e) => setWebsiteType(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', color: websiteType ? 'white' : 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', transition: 'all 0.2s', outline: 'none', appearance: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                >
                  <option value="" disabled style={{ color: '#888' }}>Select your website type</option>
                  <option value="real-estate" style={{ color: 'black' }}>Real Estate</option>
                  <option value="ecommerce" style={{ color: 'black' }}>E-commerce</option>
                  <option value="other" style={{ color: 'black' }}>Other</option>
                </select>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.opacity = '1'; }}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { if (!loading) { e.target.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
              onMouseLeave={(e) => { if (!loading) { e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.target.style.borderColor = 'var(--border)'; } }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
