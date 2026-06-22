'use client';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* Navbar */}
      <header style={{
        padding: '0 60px',
        height: '70px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="BotFlow AI" style={{ height: '54px', objectFit: 'contain' }} />
          </Link>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', gap: '36px' }}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/how-it-works" className={styles.navLink}>How it Works</Link>
        </nav>

        {/* CTA */}
        <Link href="/login" style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '50px',
          fontWeight: '700',
          fontSize: '14px',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.2s',
        }}>
          Dashboard Login →
        </Link>
      </header>

      {/* Hero Section */}
      <main style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>

        {/* Background Gradient Effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '600px', background: 'linear-gradient(180deg, #E0E7FF 0%, rgba(255,255,255,0) 100%)', zIndex: -1 }}></div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'white',
          color: 'var(--primary)',
          padding: '8px 24px',
          borderRadius: '50px',
          fontSize: '15px',
          fontWeight: '700',
          marginBottom: '24px',
          boxShadow: '0 4px 10px rgba(79,70,229,0.1)',
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 0 3px rgba(79,70,229,0.2)' }}></span>
          ✨ The Future of Customer Support
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: '52px',
          fontWeight: '800',
          color: 'var(--text-primary)',
          lineHeight: '1.2',
          marginBottom: '24px',
        }}>
          Grow Your Business <br />
          with <span style={{ background: 'linear-gradient(to right, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI-Powered Chatbots</span>
        </h1>

        <p style={{
          fontSize: '20px',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: '1.6',
          fontWeight: '500',
        }}>
          Turn your website visitors into paying customers. Train an AI in 2 minutes, embed it anywhere, and watch your sales grow 24/7.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/login" style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            padding: '16px 36px',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: '700',
            boxShadow: '0 12px 24px rgba(79,70,229,0.35)',
            transition: 'all 0.3s',
          }}>
            Start Building for Free →
          </Link>
          <Link href="/how-it-works" style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            padding: '16px 36px',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: '700',
            border: '2px solid var(--border)',
            transition: 'all 0.3s',
          }}>
            See How it Works
          </Link>
        </div>

        {/* Features Section */}
        <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '100px', textAlign: 'left' }}>
          {[
            { icon: '⚡', title: '2-Minute Setup', desc: "No coding required. Just paste your website link and we'll instantly generate your custom AI chatbot." },
            { icon: '🧠', title: 'Learns Your Business', desc: "Upload your PDFs, pricing, and FAQs. The AI reads them and answers exactly like your best sales rep." },
            { icon: '👨‍💻', title: 'Live Human Takeover', desc: "Monitor conversations in real-time and jump in manually whenever a high-ticket client arrives." },
          ].map((f, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--bg-card)',
              padding: '32px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#C7D2FE'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '10px', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing Section */}
        <div id="pricing" style={{ marginTop: '100px', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '40px' }}>
            Choose the plan that fits your business. Save more with longer commitments!
          </p>

          {/* Premium Installation Upsell */}
          <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: '24px', padding: '32px 40px', marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', textAlign: 'left', boxShadow: '0 20px 40px rgba(49, 46, 129, 0.2)' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>⭐ Premium Add-On Service</div>
              <h3 style={{ color: 'white', fontSize: '28px', fontWeight: '800', margin: '0 0 12px 0' }}>Professional Installation Service</h3>
              <p style={{ color: '#C7D2FE', fontSize: '16px', margin: '0 0 20px 0', lineHeight: '1.6', maxWidth: '600px' }}>Don't know how to code? We will install and deploy the chatbot directly on your website. Fully tested and live within 24 hours. Zero technical knowledge needed!</p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ color: '#A5B4FC', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px' }}>✅ We do everything for you</span>
                <span style={{ color: '#A5B4FC', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px' }}>✅ Live within 24 hours</span>
                <span style={{ color: '#A5B4FC', fontSize: '14px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px' }}>✅ One-time fee</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '24px 32px', borderRadius: '16px', minWidth: '240px' }}>
              <div style={{ fontSize: '48px', fontWeight: '900', color: 'white', lineHeight: '1' }}>$100</div>
              <div style={{ color: '#A5B4FC', fontSize: '14px', marginBottom: '20px', marginTop: '8px' }}>One-time payment</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a href="https://wa.me/923000000000?text=Hi! I want the Professional Installation Service ($100) for my chatbot." target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#25D366', color: 'white', padding: '12px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)', transition: 'all 0.2s' }}>
                  💬 Order via WhatsApp
                </a>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=irfangull2288@gmail.com&su=Order%3A%20Professional%20Installation%20Service%20(%24100)&body=Hi%2C%20I%20would%20like%20to%20order%20the%20chatbot%20Professional%20Installation%20Service%20(%24100).%0A%0APlease%20find%20my%20details%20below%3A%0A%0A1.%20My%20Website%20URL%3A%20%5BEnter%20your%20website%20link%5D%0A2.%20Website%20Platform%3A%20%5Be.g.%2C%20WordPress%2C%20Shopify%2C%20Wix%5D%0A%0A---%20Installation%20Access%20(Provide%20One)%20---%0AOption%20A%3A%20Website%20Admin%20Login%20(Temporary)%0AUsername%3A%20%5BEnter%20username%5D%0APassword%3A%20%5BEnter%20password%5D%0A%0AOption%20B%3A%20Google%20Tag%20Manager%0AI%20have%20invited%20irfangull2288%40gmail.com%20to%20my%20GTM.%0A%0AHow%20should%20I%20proceed%20with%20the%20payment%3F" target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#4F46E5', color: 'white', padding: '12px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)', transition: 'all 0.2s', cursor: 'pointer' }}>
                  📧 Order via Email
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
            {/* Standard Plan */}
            <div className={styles.pricingCard}>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>Standard</h3>
              <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$29<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px', flex: 1 }}>
                <li>✅ 1 Custom AI Chatbot</li>
                <li>✅ Unlimited Knowledge Training</li>
                <li>✅ Capture up to 100 Leads</li>
                <li>✅ Standard Email Support</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn} style={{ width: '100%', textAlign: 'center', backgroundColor: '#F3F4F6', color: '#111827' }}>Choose Standard</Link>
            </div>

            {/* Pro Plan */}
            <div className={styles.pricingCard} style={{ border: '2px solid var(--primary)', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
              <div className={styles.badge} style={{ backgroundColor: 'var(--primary)', position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', margin: 0, padding: '6px 16px', fontSize: '14px' }}>RECOMMENDED</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>Pro</h3>
              <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$79<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px', flex: 1 }}>
                <li>✅ 1 Custom AI Chatbot</li>
                <li>✅ Unlimited Knowledge Training</li>
                <li>🔥 <strong style={{ color: 'var(--text-primary)' }}>Unlimited Leads Capture</strong></li>
                <li>🔥 <strong style={{ color: 'var(--text-primary)' }}>Live Human Takeover</strong></li>
                <li>🔥 <strong style={{ color: 'var(--text-primary)' }}>Remove Branding</strong></li>
                <li>✅ Priority WhatsApp Support</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn} style={{ width: '100%', textAlign: 'center' }}>Choose Pro</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
