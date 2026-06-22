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
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>🤖</div>
          <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            BotFlow <span style={{ color: 'var(--primary)' }}>AI</span>
          </span>
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
                <a href="mailto:irfangull2288@gmail.com?subject=Order%3A%20Professional%20Installation%20Service%20(%24100)&body=Hi%2C%20I%20would%20like%20to%20order%20the%20chatbot%20installation%20service.%20My%20website%20is%3A%20%5BYour%20Website%20URL%5D" onClick={() => { navigator.clipboard.writeText("irfangull2288@gmail.com"); alert("If your email app doesn't open automatically, our email 'irfangull2288@gmail.com' has been copied to your clipboard so you can manually email us!"); }} style={{ display: 'block', backgroundColor: '#4F46E5', color: 'white', padding: '12px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)', transition: 'all 0.2s', cursor: 'pointer' }}>
                  📧 Order via Email
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'left' }}>
            {/* Monthly */}
            <div className={styles.pricingCard}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>Monthly</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$25<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px' }}>
                <li>✅ 1 Custom AI Chatbot</li>
                <li>✅ Unlimited Knowledge</li>
                <li>✅ Unlimited Leads</li>
                <li>✅ Live Chat Takeover</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* 3 Months - Featured */}
            <div className={styles.pricingCard} style={{ border: '2px solid var(--primary)', boxShadow: 'var(--shadow-md)' }}>
              <div className={styles.badge} style={{ backgroundColor: 'var(--primary)' }}>10% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px' }}>3 Months</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$67.5<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed every 3 months</li>
                <li>🔥 Just $22.50 / month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn} style={{ backgroundColor: 'var(--primary)', color: 'white' }}>Get Started</Link>
            </div>

            {/* 6 Months */}
            <div className={styles.pricingCard}>
              <div className={styles.badge} style={{ backgroundColor: 'var(--success)' }}>15% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>6 Months</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$127.5<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed every 6 months</li>
                <li>🔥 Just $21.25 / month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* 12 Months */}
            <div className={styles.pricingCard}>
              <div className={styles.badge} style={{ backgroundColor: 'var(--warning)' }}>25% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>12 Months</h3>
              <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>$225<span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-muted)' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', color: 'var(--text-secondary)', lineHeight: '2', fontSize: '16px' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed yearly</li>
                <li>🔥 Just $18.75 / month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
