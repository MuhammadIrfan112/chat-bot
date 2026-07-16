'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutDashboard, Code, UserCheck, PhoneCall, ChevronLeft } from 'lucide-react';
import styles from '../page.module.css';

export default function HowItWorks() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Deep Background Orbs */}
      <div className="ambient-glow" style={{ top: '-10%', right: '-10%', width: '600px', height: '600px', background: 'var(--primary-dark)' }}></div>
      <div className="ambient-glow" style={{ top: '40%', left: '-10%', width: '500px', height: '500px', background: '#38BDF8', opacity: 0.15 }}></div>

      {/* Glass Navbar */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass-panel"
        style={{ padding: '0 5%', height: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--border-light)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="RealtyPropFlow AI" style={{ height: '40px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link href="/" className={styles.navLink} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ChevronLeft size={16} /> Back to Home
        </Link>
      </motion.header>

      {/* Main Content */}
      <main style={{ paddingTop: '160px', paddingBottom: '100px', paddingLeft: '20px', paddingRight: '20px', maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '800', marginBottom: '24px' }}>
            How <span className="text-gradient-primary">RealtyPropFlow AI</span> Works
          </h1>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
            A complete system designed to capture leads, answer questions, and grow your business on autopilot. Here is what happens after you sign up.
          </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
          
          {/* Step 1 */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', gap: '40px', alignItems: 'center', padding: '40px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: 'var(--primary)' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Step 1: Dashboard Access</div>
              <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Create Your Bot & Add Knowledge</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                Once you sign up, you get access to your Admin Dashboard. Here you create your first chatbot. You paste your website link, customize the bot's colors and name, and upload your FAQs. The AI reads this data and instantly learns how to answer questions just like you.
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: '0 0 40px rgba(99,102,241,0.2)' }}>
                <LayoutDashboard size={64} />
              </div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', gap: '40px', alignItems: 'center', padding: '40px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: 'var(--accent)' }}></div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', boxShadow: '0 0 40px rgba(56,189,248,0.2)' }}>
                <Code size={64} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Step 2: Go Live</div>
              <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Embed on Your Website</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                We generate a simple 1-line script code for you. Copy and paste it into your Shopify, WordPress, Wix, or custom website. The bot appears instantly and starts greeting your visitors 24/7.
              </p>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', gap: '40px', alignItems: 'center', padding: '40px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: 'var(--success)' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Step 3: Watch the Magic</div>
              <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Capture Leads in Real-Time</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                When visitors chat with the bot, the AI intelligently asks for their Name and Email. As soon as they provide it, they instantly appear in your <b>Leads CRM</b> inside the dashboard. You can track all leads and their contact status.
              </p>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}>
                <UserCheck size={64} />
              </div>
            </div>
          </motion.div>

          {/* Step 4 */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ display: 'flex', gap: '40px', alignItems: 'center', padding: '40px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', background: 'var(--warning)' }}></div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}>
                <PhoneCall size={64} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Step 4: Ultimate Control</div>
              <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>Live Human Takeover</h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                Don't want to leave everything to the AI? No problem. Monitor conversations live from your dashboard. If you see a high-ticket client, click the <b>Takeover</b> button and chat with them manually to close the deal!
              </p>
            </div>
          </motion.div>

        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel" 
          style={{ textAlign: 'center', marginTop: '100px', padding: '60px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-50%', left: '20%', width: '600px', height: '600px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '36px', marginBottom: '24px' }}>Ready to automate your sales?</h2>
            <Link href="/login" className={styles.primaryBtn} style={{ background: 'linear-gradient(90deg, #818CF8, #C084FC)', color: 'white', border: 'none', padding: '16px 40px', boxShadow: 'var(--shadow-glow)' }}>
              Start Building for Free
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

