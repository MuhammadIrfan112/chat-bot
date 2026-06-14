'use client';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';
import styles from './page.module.css';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: 'sans-serif' }}>
      {/* Navbar */}
      <header style={{ padding: '20px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #FFFFFF, #EEF2FF)', borderBottom: '1px solid #E5E7EB', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '28px' }}>🚀</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>BotSaaS</h1>
        </div>
        <nav style={{ display: 'flex', gap: '32px', fontWeight: '600' }}>
          <span className={styles.navLink}>Features</span>
          <span className={styles.navLink}>Pricing</span>
          <Link href="/how-it-works" className={styles.navLink}>How it Works</Link>
        </nav>
        <Link href="/login" style={{ background: 'linear-gradient(to right, #4F46E5, #3B82F6)', color: 'white', padding: '10px 24px', borderRadius: '50px', fontWeight: '600', textDecoration: 'none', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)' }}>
          Dashboard / Login
        </Link>
      </header>

      {/* Hero Section */}
      <main style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '6px 16px', borderRadius: '50px', fontSize: '14px', fontWeight: '700', marginBottom: '24px' }}>
          ✨ The Future of Customer Support
        </div>
        
        <h2 style={{ fontSize: '64px', fontWeight: '900', color: '#111827', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-2px' }}>
          Grow Your Business with <br />
          <span style={{ color: '#4F46E5' }}>AI-Powered Chatbots</span>
        </h2>
        
        <p style={{ fontSize: '20px', color: '#6B7280', maxWidth: '600px', margin: '0 auto', marginBottom: '40px', lineHeight: '1.6' }}>
          Turn your website visitors into paying customers. Train an AI on your website in 2 minutes, embed it anywhere, and watch your sales grow 24/7.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link href="/login" style={{ backgroundColor: '#4F46E5', color: 'white', padding: '16px 32px', borderRadius: '8px', fontSize: '18px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)' }}>
            Start Building for Free
          </Link>
          <Link href="#demo" style={{ backgroundColor: '#FFFFFF', color: '#111827', padding: '16px 32px', borderRadius: '8px', fontSize: '18px', fontWeight: '700', textDecoration: 'none', border: '1px solid #E5E7EB' }}>
            Book a Demo
          </Link>
        </div>

        {/* Features Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '100px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>2-Minute Setup</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>No coding required. Just paste your website link and we'll instantly generate your custom AI chatbot.</p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧠</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Learns Your Business</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>Upload your PDFs, pricing, and FAQs. The AI reads them and answers exactly like your best sales rep.</p>
          </div>
          <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👨‍💻</div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Live Human Takeover</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>Monitor conversations in real-time and take over the chat manually whenever a high-ticket client arrives.</p>
          </div>
        </div>

        {/* Pricing Section */}
        <div style={{ marginTop: '120px', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '16px', letterSpacing: '-1px' }}>Simple, Transparent Pricing</h2>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '48px' }}>Choose the plan that fits your business. Save more with longer commitments!</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'left' }}>
            
            {/* Monthly */}
            <div className={styles.pricingCard}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>Monthly</h3>
              <div style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>$25<span style={{ fontSize: '16px', fontWeight: '500', color: '#6B7280' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#4B5563', lineHeight: '2' }}>
                <li>✅ 1 Custom AI Chatbot</li>
                <li>✅ Unlimited Knowledge Base</li>
                <li>✅ Unlimited Leads</li>
                <li>✅ Live Chat Takeover</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* 3 Months */}
            <div className={styles.pricingCard}>
              <div className={styles.badge} style={{ backgroundColor: '#4F46E5' }}>10% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>3 Months</h3>
              <div style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>$67.5<span style={{ fontSize: '16px', fontWeight: '500', color: '#6B7280' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#4B5563', lineHeight: '2' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed every 3 months</li>
                <li>✅ $22.50 per month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* 6 Months */}
            <div className={styles.pricingCard}>
              <div className={styles.badge} style={{ backgroundColor: '#10B981' }}>15% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>6 Months</h3>
              <div style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>$127.5<span style={{ fontSize: '16px', fontWeight: '500', color: '#6B7280' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#4B5563', lineHeight: '2' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed every 6 months</li>
                <li>✅ $21.25 per month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

            {/* 12 Months */}
            <div className={styles.pricingCard}>
              <div className={styles.badge} style={{ backgroundColor: '#F59E0B' }}>25% OFF</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>12 Months</h3>
              <div style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>$225<span style={{ fontSize: '16px', fontWeight: '500', color: '#6B7280' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#4B5563', lineHeight: '2' }}>
                <li>✅ Everything in Monthly</li>
                <li>✅ Billed yearly</li>
                <li>✅ $18.75 per month</li>
              </ul>
              <Link href="/login" className={styles.primaryBtn}>Get Started</Link>
            </div>

          </div>
        </div>
      </main>

      {/* The Chatbot */}
      <Chatbot />
    </div>
  );
}
