'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Bot, Zap, Shield, ChevronRight, Activity, MessageSquare, Star, Users, Check, ArrowRight, Sparkles, TrendingUp, Globe } from 'lucide-react';
import styles from './page.module.css';
import { useRef } from 'react';

const LOGOS = [
  { name: 'Shopify', letter: 'S', color: '#96BF48' },
  { name: 'WordPress', letter: 'W', color: '#21759B' },
  { name: 'Wix', letter: 'W', color: '#FAAD4F' },
  { name: 'Webflow', letter: 'W', color: '#4353FF' },
  { name: 'Squarespace', letter: 'S', color: '#000000' },
];

const TESTIMONIALS = [
  { name: 'Ahmad Raza', role: 'E-commerce Owner', text: 'BotFlow AI doubled our lead capture rate in the first week. Incredible ROI.', stars: 5 },
  { name: 'Sara Khan', role: 'Digital Agency', text: 'We deploy this for every client now. Setup takes 10 minutes, results are instant.', stars: 5 },
  { name: 'Mohammed Ali', role: 'SaaS Founder', text: 'The live takeover feature alone is worth the price. We close 3x more deals.', stars: 5 },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: 'var(--bg-page)', overflowX: 'hidden' }}>

      {/* ─── Ambient Background Orbs ─── */}
      <div className="ambient-glow" style={{ top: '-15%', left: '-15%', width: '700px', height: '700px', background: 'var(--primary-dark)', opacity: 0.6 }} />
      <div className="ambient-glow" style={{ top: '30%', right: '-15%', width: '600px', height: '600px', background: '#38BDF8', opacity: 0.15 }} />
      <div className="ambient-glow" style={{ bottom: '5%', left: '20%', width: '800px', height: '800px', background: '#C084FC', opacity: 0.12 }} />

      {/* ─── Sticky Glass Navbar ─── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="glass-panel"
        style={{ padding: '0 6%', height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="BotFlow AI" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </Link>

        <nav style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {['#features', '#pricing', '/how-it-works'].map((href, i) => (
            <Link key={i} href={href} className={styles.navLink}>
              {['Features', 'Pricing', 'How it Works'][i]}
            </Link>
          ))}
        </nav>

        <Link href="/login" className={styles.secondaryBtn} style={{ padding: '9px 20px', fontSize: '14px' }}>
          Dashboard Login
        </Link>
      </motion.header>

      {/* ─── HERO ─── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', zIndex: 10 }}>
        
        {/* Animated grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0, pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 2, maxWidth: '900px', margin: '0 auto' }}>

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.15)', padding: '6px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '700', marginBottom: '32px', border: '1px solid rgba(129, 140, 248, 0.3)', color: 'var(--primary)', letterSpacing: '0.02em' }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', flexShrink: 0 }} />
            NEW — BotFlow AI v2.0 is now live
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 80 }}
            style={{ fontSize: 'clamp(48px, 7vw, 88px)', fontWeight: '900', lineHeight: 1.05, marginBottom: '28px', letterSpacing: '-0.05em' }}
          >
            Turn website visitors <br />
            into <span className="text-gradient-primary">paying customers.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto 48px', lineHeight: 1.7 }}
          >
            Deploy an AI-powered chatbot trained on <em>your</em> data in under 10 minutes. Capture leads, answer questions, and close deals — 24/7, without lifting a finger.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}
          >
            <Link href="/login" className={styles.primaryBtn} style={{ background: 'linear-gradient(135deg, #818CF8 0%, #C084FC 100%)', color: 'white', padding: '16px 36px', fontSize: '16px', border: 'none', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
              Start for Free — No Credit Card
              <ChevronRight size={20} />
            </Link>
            <Link href="/how-it-works" className={styles.secondaryBtn} style={{ padding: '16px 36px', fontSize: '16px' }}>
              See How it Works
            </Link>
          </motion.div>

          {/* Social Proof Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="var(--warning)" color="var(--warning)" />)}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>4.9 / 5 rating</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>500+ Businesses</span>
            </div>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="var(--success)" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>3x Avg. Lead Increase</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Dashboard Mockup ─── */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.8 }}
          style={{ marginTop: '80px', width: '100%', maxWidth: '1100px', position: 'relative', zIndex: 2 }}
        >
          {/* Glow behind the mockup */}
          <div style={{ position: 'absolute', inset: '-40px', background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', padding: '6px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
            {/* Fake browser chrome */}
            <div style={{ background: 'rgba(9,9,11,0.9)', borderRadius: '14px 14px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c, opacity: 0.8 }} />)}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '360px', margin: '0 auto' }}>
                chat-bot.vercel.app/dashboard
              </div>
            </div>

            {/* Fake dashboard inside */}
            <div style={{ background: 'var(--bg-page)', borderRadius: '0 0 14px 14px', display: 'flex', overflow: 'hidden', height: '480px' }}>
              {/* Sidebar */}
              <div style={{ width: '200px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', padding: '24px 12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', paddingLeft: '8px' }}>
                  <div style={{ width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '6px' }} />
                  <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>BotFlow.</span>
                </div>
                {['Overview', 'My Chatbots', 'Knowledge', 'CRM Leads', 'Live Chat'].map((item, i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: '8px', marginBottom: '4px', background: i === 0 ? 'rgba(99,102,241,0.15)' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', borderLeft: i === 0 ? '2px solid var(--primary)' : '2px solid transparent' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: i === 0 ? 'var(--primary)' : 'var(--text-muted)', opacity: i === 0 ? 1 : 0.5 }} />
                    <span style={{ fontSize: '12px', color: i === 0 ? 'white' : 'var(--text-muted)', fontWeight: i === 0 ? '600' : '400' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div style={{ flex: 1, padding: '28px', overflowY: 'hidden' }}>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>Overview</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Track your chatbot's performance and leads</div>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[{label: 'Total Leads', value: '247', color: '#10B981'}, {label: 'Knowledge Items', value: '18', color: '#818CF8'}, {label: 'Chat Sessions', value: '1,482', color: '#F59E0B'}].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{s.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Leads Table */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Recent CRM Leads</span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)' }}>View All →</span>
                  </div>
                  {[
                    { name: 'Ali Hassan', email: 'ali@store.com', status: 'New Lead' },
                    { name: 'Sara Sheikh', email: 'sara@business.pk', status: 'Contacted' },
                    { name: 'Kamran Malik', email: 'kamran@co.com', status: 'New Lead' },
                  ].map((lead, i) => (
                    <div key={i} style={{ padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{lead.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{lead.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lead.email}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '50px', background: lead.status === 'New Lead' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: lead.status === 'New Lead' ? 'var(--success)' : 'var(--warning)' }}>{lead.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Trusted By Section ─── */}
      <section style={{ padding: '60px 5%', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 10 }}>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '40px' }}
        >
          Works with your existing tools
        </motion.p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', alignItems: 'center' }}>
          {LOGOS.map((logo, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5, filter: 'grayscale(100%)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: logo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', color: 'white' }}>{logo.letter}</div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '16px' }}>{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Bento Features ─── */}
      <section id="features" style={{ padding: '120px 6%', position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '72px' }}>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '20px' }}>
            Everything you need to <span className="text-gradient-primary">convert visitors</span>
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>One powerful platform to handle your entire customer engagement funnel.</p>
        </motion.div>

        <div className={styles.bentoGrid}>
          {[
            { icon: <Zap size={28} />, title: 'Lightning Fast Setup', desc: 'No coding needed. Paste your URL, upload your docs, and go live in under 10 minutes. Seriously.', color: '#38BDF8', large: true },
            { icon: <Activity size={24} />, title: 'Capture Leads 24/7', desc: 'AI intelligently collects Name and Email and pushes them straight to your CRM.', color: '#10B981', large: false },
            { icon: <Bot size={24} />, title: 'Custom Knowledge Base', desc: 'Feed it PDFs, URLs, or FAQs. Your bot answers exactly like your best sales rep.', color: '#818CF8', large: false },
            { icon: <Shield size={28} />, title: 'Live Human Takeover', desc: 'See a high-value prospect? Pause the AI and jump in yourself. Close deals manually with a single click.', color: '#F59E0B', large: true },
            { icon: <Globe size={24} />, title: 'Embed Anywhere', desc: 'Works on Shopify, WordPress, Wix, Webflow, or any custom site.', color: '#C084FC', large: false },
            { icon: <TrendingUp size={24} />, title: 'Analytics & Insights', desc: 'Track sessions, lead quality, and bot performance from your dashboard.', color: '#EF4444', large: false },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`${styles.bentoItem} ${f.large ? styles.bentoLarge : ''}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: f.color, opacity: 0.07, filter: 'blur(20px)', zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `rgba(${f.color === '#38BDF8' ? '56,189,248' : f.color === '#10B981' ? '16,185,129' : f.color === '#818CF8' ? '129,140,248' : f.color === '#F59E0B' ? '245,158,11' : f.color === '#C084FC' ? '192,132,252' : '239,68,68'},0.15)`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '24px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: f.large ? '22px' : '18px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.65', maxWidth: f.large ? '420px' : '100%' }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section style={{ padding: '100px 6%', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '16px' }}>Trusted by businesses <span className="text-gradient-primary">like yours</span></h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-panel" style={{ padding: '28px 32px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', marginBottom: '16px' }}>
                  {[...Array(t.stars)].map((_, j) => <Star key={j} size={14} fill="var(--warning)" color="var(--warning)" />)}
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '16px', lineHeight: '1.65', marginBottom: '24px', fontWeight: '500' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #818CF8, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white', flexShrink: 0 }}>{t.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" style={{ padding: '120px 6%', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '16px' }}>Simple, transparent pricing</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>Cancel anytime. No hidden fees.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', textAlign: 'left' }}>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className={styles.pricingCard}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>Starter</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Perfect for small businesses.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '52px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>$29</span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px', flex: 1 }}>
                {['1 AI Chatbot', 'Unlimited Knowledge Training', 'Up to 100 Leads/month', 'Email Support'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="var(--text-primary)" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className={styles.pricingBtn}>Get Started <ArrowRight size={16} /></Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className={`${styles.pricingCard} ${styles.pricingPro}`}>
              <div className={styles.badge}>MOST POPULAR</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>Pro</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>For growing teams & agencies.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
                <span style={{ fontSize: '52px', fontWeight: '900', letterSpacing: '-0.04em' }}>$79</span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px', flex: 1 }}>
                {['3 AI Chatbots', 'Unlimited Knowledge Training', 'Unlimited Leads Capture', 'Live Human Takeover', 'Remove BotFlow Branding', 'Priority WhatsApp Support'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="var(--primary)" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '15px', color: i < 2 ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: i >= 2 ? '600' : '400' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className={`${styles.pricingBtn} ${styles.pricingBtnPro}`}>Choose Pro <ArrowRight size={16} /></Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA Banner ─── */}
      <section style={{ padding: '80px 6%', position: 'relative', zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel"
          style={{ maxWidth: '1000px', margin: '0 auto', borderRadius: '28px', padding: '72px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden', border: '1px solid rgba(129,140,248,0.2)', boxShadow: '0 0 60px rgba(99,102,241,0.1)' }}
        >
          <div className="ambient-glow" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '300px', background: 'var(--primary)', opacity: 0.12 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(129,140,248,0.15)', padding: '6px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '700', color: 'var(--primary)', marginBottom: '28px' }}>
              <Sparkles size={14} /> Limited Offer — 15-Day Free Trial
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '20px' }}>
              Ready to automate your growth?
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              Join hundreds of businesses that never miss a lead again. Get started free — no credit card required.
            </p>
            <Link href="/login" className={styles.primaryBtn} style={{ background: 'linear-gradient(135deg, #818CF8 0%, #C084FC 100%)', color: 'white', padding: '18px 44px', fontSize: '17px', border: 'none', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
              Get Started Free <ChevronRight size={22} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 6%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 10 }}>
        <img src="/logo.png" alt="BotFlow AI" style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.4 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>&copy; {new Date().getFullYear()} BotFlow AI — All rights reserved.</p>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/how-it-works" style={{ color: 'var(--text-muted)', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>How it Works</Link>
          <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
