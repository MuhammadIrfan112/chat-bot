'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import styles from '../page.module.css';

export default function TermsOfService() {
  const lastUpdated = "September 20, 2026";

  const sections = [
    {
      id: "agreement",
      title: "1. Acceptance of Terms",
      content: `By creating an account, accessing, or using RealtyPropFlow AI ("the Service", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not access or use our platform.`
    },
    {
      id: "service-description",
      title: "2. Description of Service",
      content: `RealtyPropFlow AI provides an artificial intelligence chatbot platform tailored specifically for real estate agents, brokerages, and property managers. The service includes automated visitor engagement, property listing inquiries, intelligent lead capture, CRM synchronization, embeddable website widgets, and a live human takeover dashboard.`
    },
    {
      id: "account-registration",
      title: "3. User Accounts & Security",
      content: `To access the platform, you must register for an account by providing your full name, valid email address, and a secure password. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must notify us immediately if you suspect unauthorized access.`
    },
    {
      id: "pricing-billing",
      title: "4. Subscription, Pricing & Payments",
      content: `RealtyPropFlow AI is offered as a monthly subscription for $99/month (Premium Plan). 
      
• Billing: Subscriptions are billed in advance on a recurring monthly cycle via secure third-party payment processors (Stripe).
• No Free Trial: We do not offer free trials; access is granted upon successful initial subscription payment.
• Cancellation: You may cancel your subscription at any time through your billing settings or by contacting support. Your access will remain active until the end of your current billing period.
• Refunds: Because our AI system allocates compute, real-time scraping, and server infrastructure immediately upon account creation, fees paid are generally non-refundable except where required by law.`
    },
    {
      id: "ai-disclaimer",
      title: "5. Real Estate & AI Disclaimers",
      content: `RealtyPropFlow AI assists in answering visitor inquiries and qualifying prospective clients based on the data and FAQs you configure. 

• Informational Only: The AI responses are for informational and lead generation purposes only and do not constitute certified legal, appraisal, mortgage, or financial advice.
• Agent Responsibility: Real estate professionals and brokers maintain sole responsibility for verifying property facts, zoning, contract terms, pricing accuracy, and compliance with local Fair Housing laws and real estate licensing regulations.`
    },
    {
      id: "data-ownership",
      title: "6. Data Ownership & Customer Leads",
      content: `You retain full and exclusive ownership of all leads, client contacts, and proprietary business data captured by your chatbot. RealtyPropFlow AI will never sell, lease, or share your proprietary lead data with competitors or third-party marketers.`
    },
    {
      id: "acceptable-use",
      title: "7. Acceptable Use Policy",
      content: `You agree not to use the Service to:
• Distribute malicious code, viruses, or harmful payloads.
• Transmit spam, deceptive marketing, or violate Fair Housing or anti-discrimination regulations.
• Reverse engineer, decompile, or attempt to copy the AI logic, design, or proprietary software.
• Interfere with or compromise the security and performance of our infrastructure.`
    },
    {
      id: "termination",
      title: "8. Termination & Suspension",
      content: `We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent chargebacks, or misuse the system. You may terminate your account at any time by canceling your subscription.`
    },
    {
      id: "limitation-liability",
      title: "9. Limitation of Liability",
      content: `To the fullest extent permitted by applicable law, RealtyPropFlow AI and its operators shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from downtime, lost profits, or data inaccuracies arising from platform use.`
    },
    {
      id: "contact-us",
      title: "10. Contact & Support",
      content: `If you have any questions, concerns, or requests regarding these Terms of Service, please contact our team at support@realtypropflow.com or reach out via our contact page.`
    }
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#020617', color: '#F8FAFC' }}>
      
      {/* Background Glows */}
      <div style={{ position: 'fixed', top: '-15%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(201,162,39,0.08) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-15%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Navbar */}
      <header style={{ padding: '0 6%', height: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo-icon.png" alt="RealtyPropFlow Logo" style={{ height: '50px', width: '50px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', color: '#E5C158', fontFamily: 'Georgia, serif' }}>
            RealtyPropFlow<span style={{ color: '#E5C158' }}>.</span>
          </span>
        </Link>

        <nav className={styles.desktopOnly} style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link href="/#features" className={styles.navLink}>Features</Link>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/how-it-works" className={styles.navLink}>How it Works</Link>
          <Link href="/contact" className={styles.navLink}>Contact Us</Link>
        </nav>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" className={styles.secondaryBtn} style={{ padding: '8px 18px', fontSize: '14px' }}>
            Login
          </Link>
          <Link href="/login" className={styles.primaryBtn} style={{ padding: '8px 18px', fontSize: '14px' }}>
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ paddingTop: '140px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px', maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#94A3B8', textDecoration: 'none', fontSize: '14px', marginBottom: '28px', transition: 'color 0.2s' }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '48px' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '50px', background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.25)', color: '#E5C158', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '20px', textTransform: 'uppercase' }}>
            <FileText size={14} /> Legal & Compliance
          </div>
          
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '16px', lineHeight: 1.2 }}>
            Terms of <span style={{ color: '#E5C158' }}>Service</span>
          </h1>
          
          <p style={{ fontSize: '16px', color: '#94A3B8', lineHeight: 1.6, maxWidth: '700px' }}>
            Please read these terms carefully before using the RealtyPropFlow AI platform. These terms govern your subscription and use of our automated real estate assistant software.
          </p>

          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            Last Updated: <span style={{ color: '#E5C158', fontWeight: '600' }}>{lastUpdated}</span>
          </div>
        </motion.div>

        {/* Quick Highlights Box */}
        <div style={{ background: 'rgba(229,193,88,0.04)', border: '1px solid rgba(229,193,88,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#E5C158', fontWeight: '800', fontSize: '16px', marginBottom: '12px' }}>
            <ShieldCheck size={20} /> Quick Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontSize: '14px', color: '#CBD5E1' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>$99/month</strong> flat pricing, cancel anytime with 0 hassle.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>100% Your Leads</strong> — we never share or sell your client data.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>Live Takeover</strong> & custom FAQ knowledge base support.</span>
            </div>
          </div>
        </div>

        {/* Terms Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {sections.map((section, idx) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '30px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#F1F5F9', marginBottom: '14px', letterSpacing: '-0.01em' }}>
                {section.title}
              </h2>
              <div style={{ fontSize: '15px', color: '#94A3B8', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: '60px', textAlign: 'center', padding: '40px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '10px' }}>Ready to empower your real estate business?</h3>
          <p style={{ color: '#94A3B8', fontSize: '15px', marginBottom: '24px' }}>Create an account today and install your 24/7 AI chatbot in minutes.</p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" className={styles.primaryBtn} style={{ padding: '12px 28px', fontSize: '15px' }}>
              Create Account
            </Link>
            <Link href="/privacy" className={styles.secondaryBtn} style={{ padding: '12px 28px', fontSize: '15px' }}>
              View Privacy Policy
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 6%', background: '#030508' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo-icon.png" alt="RealtyPropFlow Logo" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            <span style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF' }}>
              RealtyPropFlow<span style={{ color: '#E5C158' }}>.</span>
            </span>
          </div>

          <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>
            &copy; {new Date().getFullYear()} RealtyPropFlow AI Inc. All rights reserved.
          </p>

          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/terms" style={{ color: '#E5C158', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>Terms of Service</Link>
            <Link href="/privacy" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/pricing" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Pricing</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
