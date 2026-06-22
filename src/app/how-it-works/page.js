'use client';
import Link from 'next/link';
import styles from '../page.module.css';

export default function HowItWorks() {
  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', fontFamily: 'var(--font-inter), sans-serif' }}>
      
      {/* Decorative background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3, zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

      {/* Navbar */}
      <header style={{ padding: '0 5%', height: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="BotFlow AI" style={{ height: '40px', objectFit: 'contain' }} />
        </Link>
        <Link href="/" className={styles.navLink} style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Back to Home</Link>
      </header>

      {/* Main Content */}
      <main style={{ padding: '100px 20px', maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.04em' }}>How <span style={{ color: 'var(--primary)' }}>BotFlow AI</span> Works</h1>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
            A complete system designed to capture leads, answer questions, and grow your business on autopilot. Here is what happens after you sign up.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
          
          {/* Step 1 */}
          <div className="animate-slide-up" style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', animationDelay: '0.1s' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Step 1: Dashboard Access</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>Create Your Bot & Add Knowledge</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                Once you sign up, you get access to your Admin Dashboard. Here you create your first chatbot. You paste your website link, customize the bot's colors and name, and upload your FAQs. The AI reads this data and instantly learns how to answer questions just like you.
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--primary-light)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="animate-slide-up" style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '40px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)', animationDelay: '0.2s' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '160px', height: '160px', backgroundColor: '#E0F2FE', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Step 2: Go Live</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>Embed on Your Website</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                We generate a simple 1-line script code for you. Copy and paste it into your Shopify, WordPress, Wix, or custom website. The bot appears instantly and starts greeting your visitors 24/7.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="animate-slide-up" style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', animationDelay: '0.3s' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Step 3: Watch the Magic</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>Capture Leads in Real-Time</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                When visitors chat with the bot, the AI intelligently asks for their Name and Email. As soon as they provide it, they instantly appear in your <b>Leads CRM</b> inside the dashboard. You can track all leads and their contact status.
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '160px', height: '160px', backgroundColor: '#ECFDF5', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="animate-slide-up" style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#FFFBEB', padding: '40px', borderRadius: '24px', border: '1px solid #FDE68A', boxShadow: 'var(--shadow-sm)', animationDelay: '0.4s' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '160px', height: '160px', backgroundColor: '#FEF3C7', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Step 4: Ultimate Control</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>Live Human Takeover</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                Don't want to leave everything to the AI? No problem. Monitor conversations live from your dashboard. If you see a high-ticket client, click the <b>Takeover</b> button and chat with them manually to close the deal!
              </p>
            </div>
          </div>

        </div>

        <div className="animate-slide-up" style={{ textAlign: 'center', marginTop: '100px', padding: '60px', backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', animationDelay: '0.5s' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '24px', letterSpacing: '-0.02em' }}>Ready to automate your sales?</h2>
          <Link href="/login" style={{ display: 'inline-block', backgroundColor: 'var(--primary)', color: 'white', padding: '16px 40px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Start Building for Free
          </Link>
        </div>
      </main>
    </div>
  );
}
