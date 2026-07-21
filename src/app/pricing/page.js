'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, ChevronLeft, Zap } from 'lucide-react';
import styles from '../page.module.css';

export default function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      description: "Perfect for starting agents and small agencies looking to automate lead capture.",
      features: [
        { name: "1 AI Chatbot", included: true },
        { name: "10 Knowledge Training", included: true },
        { name: "300 Leads Collect", included: true },
        { name: "Live Human Takeover", included: false },
        { name: "Unlimited Knowledge Training", included: false },
        { name: "Unlimited Leads Capture", included: false },
      ],
      ctaText: "Start Basic",
      popular: false,
      glow: "rgba(255,255,255,0.05)"
    },
    {
      name: "Pro",
      price: "$49",
      period: "/month",
      description: "For top-producing agents who need advanced features and high volume.",
      features: [
        { name: "1 AI Chatbot", included: true },
        { name: "Unlimited Knowledge Training", included: true },
        { name: "Unlimited Leads Capture", included: true },
        { name: "Live Human Takeover", included: true },
      ],
      ctaText: "Get Pro (Recommended)",
      popular: true,
      glow: "rgba(201,162,39,0.2)"
    }
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#020617' }}>
      
      {/* Background Gradients */}
      <div style={{ position: 'fixed', top: '-20%', left: '30%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(201,162,39,0.1) 0%, rgba(0,0,0,0) 60%)', zIndex: 0, pointerEvents: 'none' }} />

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
            Transparent Pricing
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: '800', marginBottom: '24px', lineHeight: 1.1, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            Simple plans for <span style={{ color: '#E5C158' }}>growing</span> agents.
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Choose the perfect plan to put your lead generation on autopilot. No hidden fees.
          </p>
        </motion.div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          {plans.map((plan, idx) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.2 }}
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                background: 'rgba(15, 23, 42, 0.4)', 
                backdropFilter: 'blur(20px)', 
                border: plan.popular ? '2px solid rgba(201,162,39,0.5)' : '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '32px', 
                padding: '40px', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: plan.popular ? '0 20px 60px rgba(201,162,39,0.15)' : 'none'
              }}
            >
              {plan.popular && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 100%)', color: '#000', padding: '6px 20px', borderRadius: '50px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 20px rgba(201,162,39,0.4)' }}>
                  <Zap size={14} /> MOST POPULAR
                </div>
              )}
              
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#F8FAFC', marginBottom: '8px' }}>{plan.name}</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px', minHeight: '40px' }}>{plan.description}</p>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '48px', fontWeight: '800', color: '#F1F5F9', letterSpacing: '-0.03em' }}>{plan.price}</span>
                <span style={{ fontSize: '16px', color: '#64748B', fontWeight: '500' }}>{plan.period}</span>
              </div>

              <Link href="/login" style={{ 
                display: 'block', 
                textAlign: 'center', 
                width: '100%', 
                padding: '16px', 
                borderRadius: '16px', 
                fontWeight: '700', 
                fontSize: '16px', 
                textDecoration: 'none', 
                background: plan.popular ? 'linear-gradient(135deg, #C9A227 0%, #E5C158 100%)' : 'rgba(255,255,255,0.05)',
                color: plan.popular ? '#000' : '#F1F5F9',
                border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                marginBottom: '40px',
                transition: 'all 0.2s ease',
                boxShadow: plan.popular ? '0 10px 30px rgba(201,162,39,0.2)' : 'none'
              }}>
                {plan.ctaText}
              </Link>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {plan.features.map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: feature.included ? 1 : 0.4 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: feature.included ? 'rgba(16,185,129,0.1)' : 'transparent', border: feature.included ? 'none' : '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {feature.included ? <Check size={12} color="#10B981" /> : <X size={12} color="#475569" />}
                    </div>
                    <span style={{ fontSize: '15px', color: feature.included ? '#E2E8F0' : '#64748B' }}>{feature.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </main>
    </div>
  );
}
