'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import styles from '../page.module.css';

export default function PrivacyPolicy() {
  const lastUpdated = "September 20, 2026";

  const sections = [
    {
      id: "intro",
      title: "1. Overview & Commitment",
      content: `At RealtyPropFlow AI ("we", "us", "our"), we respect your privacy and are committed to protecting the personal information of both our subscribers (agents, brokerages) and the prospective clients who interact with our AI chat widgets. This Privacy Policy explains what information we collect, how it is processed, and how you maintain control over your data.`
    },
    {
      id: "data-collection",
      title: "2. Information We Collect",
      content: `We collect information necessary to operate and optimize the AI chatbot service:

• Account Information: Your full name, email address, password hash, and billing identifier when you register.
• Chatbot Configuration Data: Custom business instructions, FAQs, office details, listing URLs, agent contact details, and color preferences you enter into your dashboard.
• Lead & Visitor Data: When visitors chat with your embedded widget, we process the conversation text, contact details voluntarily provided by the visitor (such as name, phone number, email, property interests, and budget), and timestamps.
• Technical Logs: Standard server telemetry, IP addresses, browser user-agents, and session metrics for security, fraud prevention, and performance monitoring.`
    },
    {
      id: "data-use",
      title: "3. How We Use Your Information",
      content: `We use collected information solely for:
• Powering the conversational AI responses and routing buyer inquiries to your agent dashboard in real time.
• Notifying you instantly of qualified leads and high-intent buyer inquiries.
• Managing subscription billing and authentication.
• Providing customer support and troubleshooting platform issues.
• Protecting against malicious activities, spam, and security breaches.`
    },
    {
      id: "no-sharing",
      title: "4. We Do Not Sell Your Leads",
      content: `Your leads are 100% yours. RealtyPropFlow AI will never sell, rent, monetize, or transfer your leads or your clients' contact information to external advertisers, rival brokers, or data brokers.`
    },
    {
      id: "security",
      title: "5. Data Security & Storage",
      content: `We implement modern, industry-standard security protocols to safeguard your information:
• All communication with our servers is encrypted in transit using Transport Layer Security (TLS/SSL).
• Sensitive credentials and passwords are encrypted using secure cryptographic hashing algorithms.
• Databases and lead storage are protected with strict access control lists and firewalls.`
    },
    {
      id: "third-parties",
      title: "6. Third-Party Service Providers",
      content: `We partner with trusted third-party providers for essential infrastructure:
• Payment Processing: Stripe handles billing details securely; we never store your complete credit card numbers.
• Cloud Hosting: High-performance cloud infrastructure providers that comply with SOC2 and ISO 27001 data security standards.`
    },
    {
      id: "rights",
      title: "7. Your Rights & Data Portability",
      content: `As an account owner, you have the right to:
• Access, export, or download your lead data at any time from your CRM dashboard.
• Update your personal and account details directly in account settings.
• Request the complete deletion of your account, chatbot configurations, and associated chat logs by emailing support@realtypropflow.com.`
    },
    {
      id: "updates",
      title: "8. Updates to this Policy",
      content: `We may revise this Privacy Policy periodically to reflect new system capabilities or legal obligations. We will notify active account holders of any material changes via email or a dashboard notice.`
    },
    {
      id: "contact",
      title: "9. Contact Information",
      content: `For privacy-related inquiries, data requests, or compliance questions, please contact our Data Protection Team at support@realtypropflow.com.`
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

      {/* Main Content */}
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '50px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38BDF8', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '20px', textTransform: 'uppercase' }}>
            <Shield size={14} /> Privacy & Protection
          </div>
          
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '16px', lineHeight: 1.2 }}>
            Privacy <span style={{ color: '#E5C158' }}>Policy</span>
          </h1>
          
          <p style={{ fontSize: '16px', color: '#94A3B8', lineHeight: 1.6, maxWidth: '700px' }}>
            Your privacy and client confidentiality are our utmost priority. Learn how RealtyPropFlow AI protects and handles your data.
          </p>

          <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748B' }}>
            Last Updated: <span style={{ color: '#E5C158', fontWeight: '600' }}>{lastUpdated}</span>
          </div>
        </motion.div>

        {/* Highlights Box */}
        <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38BDF8', fontWeight: '800', fontSize: '16px', marginBottom: '12px' }}>
            <Lock size={20} /> Privacy Guarantees
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontSize: '14px', color: '#CBD5E1' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>Zero Data Selling:</strong> We never sell your leads or data to competitors.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>End-to-End Encryption:</strong> Encrypted in transit and protected at rest.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>Data Export & Deletion:</strong> Complete control over your lead logs at all times.</span>
            </div>
          </div>
        </div>

        {/* Sections */}
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
          <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '10px' }}>Have questions about your data?</h3>
          <p style={{ color: '#94A3B8', fontSize: '15px', marginBottom: '24px' }}>Our technical team is ready to answer any questions about compliance and security.</p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/terms" className={styles.secondaryBtn} style={{ padding: '12px 28px', fontSize: '15px' }}>
              View Terms of Service
            </Link>
            <Link href="/contact" className={styles.primaryBtn} style={{ padding: '12px 28px', fontSize: '15px' }}>
              Contact Support
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
            <Link href="/terms" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/privacy" style={{ color: '#38BDF8', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>Privacy Policy</Link>
            <Link href="/pricing" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Pricing</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
