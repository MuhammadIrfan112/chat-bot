'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LayoutDashboard, Code, UserCheck, PhoneCall, ChevronLeft, ArrowRight } from 'lucide-react';
import styles from '../page.module.css';

export default function HowItWorks() {
  const steps = [
    {
      id: "01",
      title: "Create Your AI Agent",
      description: "Sign up and access your intuitive dashboard. Give your AI a name, customize its colors, and upload your FAQs. The AI instantly reads and understands your business logic.",
      icon: LayoutDashboard,
      color: "#C9A227",
      gradient: "linear-gradient(135deg, rgba(201,162,39,0.2) 0%, rgba(201,162,39,0.05) 100%)"
    },
    {
      id: "02",
      title: "Embed in 1 Minute",
      description: "We generate a simple, one-line script tag for you. Just copy and paste it into your website (Shopify, WordPress, custom HTML). Your AI assistant appears instantly, ready to serve 24/7.",
      icon: Code,
      color: "#38BDF8",
      gradient: "linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.05) 100%)"
    },
    {
      id: "03",
      title: "Capture & Convert Leads",
      description: "When visitors ask questions, the AI intelligently assists them and captures their contact details. Every lead is instantly pushed to your CRM dashboard so you never miss an opportunity.",
      icon: UserCheck,
      color: "#10B981",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)"
    },
    {
      id: "04",
      title: "Live Human Takeover",
      description: "Monitor conversations live from your dashboard. If you see a high-ticket client, click the Takeover button and chat with them manually to close the deal instantly!",
      icon: PhoneCall,
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)"
    }
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#020617' }}>
      
      {/* Background Gradients */}
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(201,162,39,0.08) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(0,0,0,0) 70%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Navbar */}
      <motion.header 
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ padding: '0 6%', height: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Logo: icon + text  */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo-icon.png" alt="RealtyPropFlow Logo" style={{ height: '45px', width: '45px', objectFit: 'contain', mixBlendMode: 'lighten' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
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
      <main style={{ paddingTop: '160px', paddingBottom: '120px', paddingLeft: '24px', paddingRight: '24px', maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '100px' }}
        >
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '50px', background: 'rgba(201,162,39,0.1)', color: '#E5C158', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '24px', textTransform: 'uppercase' }}>
            System Workflow
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: '800', marginBottom: '24px', lineHeight: 1.1, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            How It <span style={{ color: '#E5C158' }}>Works</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            A seamless four-step process to deploy an intelligent, lead-generating AI assistant for your business.
          </p>
        </motion.div>

        <div style={{ position: 'relative' }}>
          {/* Vertical Connecting Line (Desktop Only) */}
          <div style={{ position: 'absolute', top: '40px', bottom: '40px', left: '50px', width: '2px', background: 'linear-gradient(to bottom, rgba(201,162,39,0.5), rgba(56,189,248,0.5), rgba(16,185,129,0.5), rgba(245,158,11,0.5))', zIndex: 1 }} className={styles.desktopOnly} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}
                  className={styles.timelineItem}
                >
                  {/* Icon Node */}
                  <div style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '24px', background: step.gradient, border: `1px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${step.color}20`, position: 'relative', zIndex: 3 }}>
                    <Icon size={40} color={step.color} />
                    <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '32px', height: '32px', borderRadius: '50%', background: '#0F172A', border: `1px solid ${step.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: step.color }}>
                      {step.id}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px', transition: 'all 0.3s ease', cursor: 'default' }}
                       onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = `${step.color}40`; }}
                       onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#F1F5F9', marginBottom: '16px', letterSpacing: '-0.02em' }}>{step.title}</h2>
                    <p style={{ fontSize: '16px', color: '#94A3B8', lineHeight: '1.7' }}>
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Call to action */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginTop: '120px', padding: '60px 40px', background: 'linear-gradient(135deg, rgba(201,162,39,0.1) 0%, rgba(201,162,39,0.02) 100%)', borderRadius: '32px', border: '1px solid rgba(201,162,39,0.2)' }}
        >
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#F8FAFC', marginBottom: '20px' }}>Ready to automate your growth?</h2>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '16px 32px', background: 'linear-gradient(135deg, #C9A227 0%, #E5C158 100%)', color: '#000', borderRadius: '12px', fontWeight: '700', fontSize: '16px', textDecoration: 'none', boxShadow: '0 10px 30px rgba(201,162,39,0.3)' }}>
            Get Started Now <ArrowRight size={20} />
          </Link>
        </motion.div>

      </main>

      {/* Global override for timeline item mobile responsiveness */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .timelineItem {
            flex-direction: column !important;
            gap: 24px !important;
          }
          .desktopOnly {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
