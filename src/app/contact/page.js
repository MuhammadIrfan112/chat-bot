'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, ChevronLeft, Check } from 'lucide-react';
import styles from '../page.module.css';

export default function ContactUs() {
  const [formStatus, setFormStatus] = useState('idle');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus('submitting');
    setTimeout(() => {
      setFormStatus('success');
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#020617' }}>
      
      {/* Background Gradients */}
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(201,162,39,0.08) 0%, rgba(0,0,0,0) 60%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-20%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, rgba(0,0,0,0) 60%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Navbar */}
      <motion.header 
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ padding: '0 6%', height: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Logo: icon + text  */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', background: 'transparent' }}>
          <img src="/logo-icon.png" alt="RealtyPropFlow Logo" style={{ height: '48px', width: '48px', objectFit: 'contain', background: 'transparent', display: 'block', mixBlendMode: 'screen' }} />
          <span style={{ fontSize: '16px', fontWeight: '900', fontStyle: 'italic', color: '#E5C158', letterSpacing: '0.01em', fontFamily: 'Georgia, serif' }}>
            RealtyPropFlow<span style={{ color: '#E5C158' }}>.</span>
          </span>
        </Link>

        <nav className={styles.desktopOnly} style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {[['/#features', 'Features'], ['/pricing', 'Pricing'], ['/how-it-works', 'How it Works'], ['/contact', 'Contact Us']].map(([href, label]) => (
            <Link key={href} href={href} className={styles.navLink}>{label}</Link>
          ))}
        </nav>

        <div className={styles.desktopOnly} style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login" className={styles.secondaryBtn} style={{ padding: '8px 20px', fontSize: '14px' }}>
            Login
          </Link>
          <Link href="/login" className={styles.primaryBtn} style={{ padding: '8px 20px', fontSize: '14px' }}>
            Sign up
          </Link>
        </div>
      </motion.header>

      {/* Main Content */}
      <main style={{ paddingTop: '160px', paddingBottom: '120px', paddingLeft: '24px', paddingRight: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '50px', background: 'rgba(201,162,39,0.1)', color: '#E5C158', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '24px', textTransform: 'uppercase' }}>
            Get in Touch
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: '800', marginBottom: '24px', lineHeight: 1.1, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            Let's talk about your <span style={{ color: '#E5C158' }}>growth</span>.
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Have questions about RealtyPropFlow? Our team is here to help you set up your AI assistant and scale your real estate business.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'flex-start' }}>
          
          {/* Contact Information */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,162,39,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E5C158', flexShrink: 0 }}>
                <Mail size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F1F5F9', marginBottom: '8px' }}>Email Us</h3>
                <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>For general inquiries and support, drop us an email anytime.</p>
                <a href="mailto:support@realtypropflow.com" style={{ color: '#E5C158', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }}>support@realtypropflow.com</a>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', flexShrink: 0 }}>
                <span style={{ fontSize: '24px' }}>💬</span>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F1F5F9', marginBottom: '8px' }}>WhatsApp Us</h3>
                <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6', marginBottom: '12px' }}>Chat with us directly on WhatsApp for quick support, anytime.</p>
                <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }}>+1 (234) 567-890</a>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
                <MapPin size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F1F5F9', marginBottom: '8px' }}>Office</h3>
                <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: '1.6' }}>
                  123 Innovation Drive, Suite 400<br />
                  New York, NY 10001
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '48px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#F1F5F9', marginBottom: '8px' }}>Send a Message</h2>
            <p style={{ color: '#94A3B8', fontSize: '15px', marginBottom: '32px' }}>Fill out the form below and we'll get back to you within 24 hours.</p>

            {formStatus === 'success' ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#000' }}>
                  <Check size={32} />
                </div>
                <h3 style={{ fontSize: '20px', color: '#F1F5F9', marginBottom: '8px' }}>Message Sent!</h3>
                <p style={{ color: '#94A3B8', fontSize: '15px' }}>Thank you for reaching out. We will be in touch shortly.</p>
                <button onClick={() => setFormStatus('idle')} style={{ marginTop: '24px', background: 'none', border: 'none', color: '#E5C158', fontWeight: '600', cursor: 'pointer' }}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '8px' }}>First Name</label>
                    <input required type="text" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '15px', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '8px' }}>Last Name</label>
                    <input required type="text" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '15px', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '8px' }}>Email Address</label>
                  <input required type="email" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '15px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '8px' }}>Message</label>
                  <textarea required rows="4" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '15px', outline: 'none', resize: 'vertical' }}></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={formStatus === 'submitting'}
                  style={{ marginTop: '12px', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 100%)', color: '#000', border: 'none', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: formStatus === 'submitting' ? 'not-allowed' : 'pointer', opacity: formStatus === 'submitting' ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(201,162,39,0.2)' }}
                >
                  {formStatus === 'submitting' ? 'Sending...' : (
                    <>Send Message <Send size={18} /></>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>

      </main>
    </div>
  );
}
