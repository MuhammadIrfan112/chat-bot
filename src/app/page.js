'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Zap, Shield, ChevronRight, Activity, MessageSquare } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Deep Background Orbs */}
      <div className="ambient-glow" style={{ top: '-10%', left: '-10%', width: '600px', height: '600px', background: 'var(--primary-dark)' }}></div>
      <div className="ambient-glow" style={{ top: '20%', right: '-10%', width: '500px', height: '500px', background: '#38BDF8', opacity: 0.2 }}></div>
      <div className="ambient-glow" style={{ bottom: '-10%', left: '30%', width: '800px', height: '800px', background: '#C084FC', opacity: 0.15 }}></div>

      {/* Glass Navbar */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="glass-panel"
        style={{
          padding: '0 5%', height: '80px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          borderBottom: '1px solid var(--border-light)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="BotFlow AI" style={{ height: '40px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>

        <nav style={{ display: 'flex', gap: '40px' }}>
          <Link href="#features" className={styles.navLink}>Features</Link>
          <Link href="#pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/how-it-works" className={styles.navLink}>How it Works</Link>
        </nav>

        <Link href="/login" className={styles.secondaryBtn} style={{ padding: '8px 20px', fontSize: '14px' }}>
          Dashboard Login
        </Link>
      </motion.header>

      {/* Hero Section */}
      <main style={{ paddingTop: '160px', paddingBottom: '100px', paddingLeft: '20px', paddingRight: '20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '50px', fontSize: '14px', fontWeight: '600', marginBottom: '32px', border: '1px solid var(--border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>BotFlow AI v2.0 is now live</span>
          </motion.div>

          <motion.h1 variants={itemVariants} style={{ fontSize: '72px', lineHeight: '1.1', marginBottom: '24px' }}>
            Automate your support. <br />
            <span className="text-gradient-primary">Scale your business.</span>
          </motion.h1>

          <motion.p variants={itemVariants} style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto 48px', lineHeight: '1.6' }}>
            Build an intelligent AI chatbot trained on your exact data in minutes. Engage visitors, capture leads, and provide instant support 24/7 without writing a single line of code.
          </motion.p>

          <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/login" className={styles.primaryBtn} style={{ background: 'linear-gradient(90deg, #818CF8, #C084FC)', color: 'white', padding: '16px 36px', border: 'none', boxShadow: 'var(--shadow-glow)' }}>
              Start Building Free <ChevronRight size={18} style={{ marginLeft: '8px' }} />
            </Link>
            <Link href="/how-it-works" className={styles.secondaryBtn} style={{ padding: '16px 36px' }}>
              See How it Works
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview / Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.6 }}
          style={{ marginTop: '80px', borderRadius: '24px', border: '1px solid var(--border-light)', padding: '8px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow-glow-large)' }}
        >
          <div style={{ background: 'var(--bg-page)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: '32px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
            </div>
            <div style={{ height: '400px', backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <img src="/logo-icon.png" alt="Mockup" style={{ width: '80px', filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
            </div>
          </div>
        </motion.div>

        {/* Bento Box Features */}
        <div id="features" className={styles.bentoGrid}>
          {/* Feature 1 (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${styles.bentoItem} ${styles.bentoLarge}`}
          >
            <Zap size={32} color="var(--accent)" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Lightning Fast Setup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '400px' }}>
              No coding required. Just paste your website link and we'll instantly generate your custom AI chatbot powered by cutting-edge language models.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={styles.bentoItem}
          >
            <Activity size={32} color="var(--success)" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Capture Leads</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Automatically ask for visitor details and sync them directly to your CRM. Never miss a sale again.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={styles.bentoItem}
          >
            <Bot size={32} color="var(--primary)" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Custom Knowledge</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Upload PDFs and URLs. The AI reads them and answers exactly like your best sales representative.
            </p>
          </motion.div>

          {/* Feature 4 (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className={`${styles.bentoItem} ${styles.bentoLarge}`}
          >
            <Shield size={32} color="#F59E0B" style={{ marginBottom: '24px' }} />
            <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Live Human Takeover</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '400px' }}>
              Monitor conversations in real-time. If a high-ticket client arrives, pause the AI and jump in manually to close the deal yourself.
            </p>
          </motion.div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" style={{ marginTop: '160px', marginBottom: '80px' }}>
          <motion.h2 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ fontSize: '48px', marginBottom: '16px' }}
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '64px' }}
          >
            Choose the perfect plan for your business needs. Cancel anytime.
          </motion.p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Standard Plan */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className={styles.pricingCard}
            >
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Starter</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Perfect for small businesses.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '800' }}>$29</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', color: 'var(--text-secondary)', fontSize: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--text-primary)' }}>✓</div> 1 Custom AI Chatbot</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--text-primary)' }}>✓</div> Unlimited Knowledge Training</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--text-primary)' }}>✓</div> Capture up to 100 Leads</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--text-primary)' }}>✓</div> Standard Email Support</li>
              </ul>
              <Link href="/login" className={styles.pricingBtn}>Get Started</Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className={`${styles.pricingCard} ${styles.pricingPro}`}
            >
              <div className={styles.badge}>RECOMMENDED</div>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Pro</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>For growing teams that need more power.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '800' }}>$79</span>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', color: 'var(--text-primary)', fontSize: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--primary)' }}>✓</div> 3 Custom AI Chatbots</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--primary)' }}>✓</div> Unlimited Knowledge Training</li>
                <li style={{ display: 'flex', gap: '12px', fontWeight: '700' }}><div style={{ color: 'var(--primary)' }}>✓</div> Unlimited Leads Capture</li>
                <li style={{ display: 'flex', gap: '12px', fontWeight: '700' }}><div style={{ color: 'var(--primary)' }}>✓</div> Live Human Takeover</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--primary)' }}>✓</div> Remove Branding</li>
                <li style={{ display: 'flex', gap: '12px' }}><div style={{ color: 'var(--primary)' }}>✓</div> Priority WhatsApp Support</li>
              </ul>
              <Link href="/login" className={`${styles.pricingBtn} ${styles.pricingBtnPro}`}>Choose Pro</Link>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 5%', textAlign: 'center', position: 'relative', zIndex: 10, background: 'var(--bg-base)' }}>
        <img src="/logo.png" alt="BotFlow AI" style={{ height: '32px', objectFit: 'contain', marginBottom: '16px', filter: 'brightness(0) invert(1)', opacity: 0.5 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} BotFlow AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
