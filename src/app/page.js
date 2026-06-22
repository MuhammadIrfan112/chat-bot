'use client';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3, zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', top: '20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

      {/* Navbar */}
      <header style={{
        padding: '0 5%',
        height: '80px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="BotFlow AI" style={{ height: '44px', objectFit: 'contain' }} />
          </Link>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', gap: '40px' }}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/how-it-works" className={styles.navLink}>How it Works</Link>
        </nav>

        {/* CTA */}
        <Link href="/login" style={{
          backgroundColor: 'var(--text-primary)',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          Dashboard Login
        </Link>
      </header>

      {/* Hero Section */}
      <main style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>

        {/* Badge */}
        <div className="animate-slide-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary-dark)',
          padding: '6px 16px',
          borderRadius: '50px',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '32px',
          border: '1px solid #C7D2FE'
        }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 0 2px rgba(99,102,241,0.2)' }}></span>
          The New Standard in Customer Support
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up" style={{
          fontSize: '64px',
          fontWeight: '800',
          color: 'var(--text-primary)',
          lineHeight: '1.1',
          marginBottom: '24px',
          letterSpacing: '-0.04em',
          animationDelay: '0.1s'
        }}>
          Automate Your Support. <br />
          <span style={{ color: 'var(--primary)' }}>Scale Your Business.</span>
        </h1>

        <p className="animate-slide-up" style={{
          fontSize: '20px',
          color: 'var(--text-secondary)',
          maxWidth: '640px',
          margin: '0 auto 48px',
          lineHeight: '1.6',
          animationDelay: '0.2s'
        }}>
          Build an intelligent AI chatbot trained on your data in minutes. Engage visitors, capture leads, and provide instant support 24/7 without writing a single line of code.
        </p>

        {/* CTA Buttons */}
        <div className="animate-slide-up" style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', animationDelay: '0.3s' }}>
          <Link href="/login" style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = 'var(--primary-dark)'; e.target.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = 'var(--primary)'; e.target.style.transform = 'translateY(0)' }}
          >
            Start Building for Free
          </Link>
          <Link href="/how-it-works" style={{
            backgroundColor: 'white',
            color: 'var(--text-primary)',
            padding: '16px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#F8FAFC'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}
          >
            See How it Works
          </Link>
        </div>

        {/* Features Section */}
        <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '120px', textAlign: 'left' }}>
          {[
            { 
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>, 
              title: 'Lightning Fast Setup', 
              desc: "No coding required. Just paste your website link and we'll instantly generate your custom AI chatbot." 
            },
            { 
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, 
              title: 'Custom Knowledge', 
              desc: "Upload your PDFs, pricing, and FAQs. The AI reads them and answers exactly like your best sales rep." 
            },
            { 
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, 
              title: 'Human Takeover', 
              desc: "Monitor conversations in real-time and jump in manually whenever a high-ticket client arrives." 
            },
          ].map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIconWrap}>{f.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing Section */}
        <div id="pricing" style={{ marginTop: '140px', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '64px' }}>
            Choose the perfect plan for your business needs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
            {/* Standard Plan */}
            <div className={styles.pricingCard}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Starter</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Perfect for small businesses starting out.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>$29</span>
                <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', color: 'var(--text-secondary)', fontSize: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--success)' }}>✓</span> 1 Custom AI Chatbot</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--success)' }}>✓</span> Unlimited Knowledge Training</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--success)' }}>✓</span> Capture up to 100 Leads</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--success)' }}>✓</span> Standard Email Support</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn} style={{ backgroundColor: 'var(--text-primary)', color: 'white' }}>Get Started</Link>
            </div>

            {/* Pro Plan */}
            <div className={styles.pricingCard} style={{ border: '2px solid var(--primary)', boxShadow: 'var(--shadow-md)', position: 'relative' }}>
              <div className={styles.badge} style={{ backgroundColor: 'var(--primary)' }}>RECOMMENDED</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>Pro</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>For growing teams that need more power.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>$79</span>
                <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', color: 'var(--text-secondary)', fontSize: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--primary)' }}>✓</span> 1 Custom AI Chatbot</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--primary)' }}>✓</span> Unlimited Knowledge Training</li>
                <li style={{ display: 'flex', gap: '12px', fontWeight: '600', color: 'var(--text-primary)' }}><span style={{ color: 'var(--primary)' }}>✓</span> Unlimited Leads Capture</li>
                <li style={{ display: 'flex', gap: '12px', fontWeight: '600', color: 'var(--text-primary)' }}><span style={{ color: 'var(--primary)' }}>✓</span> Live Human Takeover</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--primary)' }}>✓</span> Remove BotFlow Branding</li>
                <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--primary)' }}>✓</span> Priority WhatsApp Support</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn} style={{ backgroundColor: 'var(--primary)', color: 'white' }}>Choose Pro</Link>
            </div>
          </div>
          
          {/* Setup Upsell */}
          <div style={{ marginTop: '48px', backgroundColor: '#F1F5F9', borderRadius: '16px', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', maxWidth: '800px', margin: '48px auto 0', textAlign: 'left' }}>
            <div>
              <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Need help with setup?</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Get our team to build and install your chatbot for a one-time fee of $100.</p>
            </div>
            <a href="https://wa.me/923000000000" target="_blank" rel="noreferrer" style={{ backgroundColor: 'white', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
              Contact Sales
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 5%', textAlign: 'center', position: 'relative', zIndex: 10, backgroundColor: 'white' }}>
        <img src="/logo.png" alt="BotFlow AI" style={{ height: '32px', objectFit: 'contain', marginBottom: '16px', filter: 'grayscale(100%)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} BotFlow AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
