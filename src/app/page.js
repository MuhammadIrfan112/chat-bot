'use client';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Bot, Zap, Shield, ChevronRight, Activity, Check, ArrowRight, Sparkles, TrendingUp, Globe, Star } from 'lucide-react';
import styles from './page.module.css';
import { useRef } from 'react';

const LOGOS = [
  { name: 'Shopify', letter: 'S', bg: '#96BF48' },
  { name: 'WordPress', letter: 'W', bg: '#21759B' },
  { name: 'Wix', letter: 'W', bg: '#FAAD4F' },
  { name: 'Webflow', letter: 'W', bg: '#4353FF' },
  { name: 'Squarespace', letter: 'S', bg: '#2C2C2C' },
];

const TESTIMONIALS = [
  { name: 'Ahmad Raza', role: 'E-commerce Owner', text: 'BotFlow AI doubled our lead capture rate in the first week. Incredible ROI.', stars: 5 },
  { name: 'Sara Khan', role: 'Digital Agency', text: 'We deploy this for every client now. Setup takes 10 minutes, results are instant.', stars: 5 },
  { name: 'Mohammed Ali', role: 'SaaS Founder', text: 'The live takeover feature alone is worth the price. We close 3x more deals.', stars: 5 },
];

const FEATURES = [
  { icon: <Zap size={22} />, title: 'Lightning Fast Setup', desc: 'No coding needed. Paste your URL, upload your docs, and go live in under 10 minutes.', color: '#38BDF8', rgb: '56,189,248' },
  { icon: <Activity size={22} />, title: 'Capture Leads 24/7', desc: 'AI intelligently collects Name and Email and pushes them straight to your CRM.', color: '#10B981', rgb: '16,185,129' },
  { icon: <Bot size={22} />, title: 'Custom Knowledge Base', desc: 'Feed it PDFs, URLs, or FAQs. Your bot answers exactly like your best sales rep.', color: '#818CF8', rgb: '129,140,248' },
  { icon: <Shield size={22} />, title: 'Live Human Takeover', desc: 'See a high-value prospect? Pause the AI and jump in yourself with a single click.', color: '#F59E0B', rgb: '245,158,11' },
  { icon: <Globe size={22} />, title: 'Embed Anywhere', desc: 'Works on Shopify, WordPress, Wix, Webflow, or any custom-built website.', color: '#C084FC', rgb: '192,132,252' },
  { icon: <TrendingUp size={22} />, title: 'Analytics & Insights', desc: 'Track sessions, lead quality, and bot performance from your live dashboard.', color: '#EF4444', rgb: '239,68,68' },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: 'var(--bg-page)', overflowX: 'hidden' }}>

      {/* ─── Ambient orbs (positioned to only affect hero area) ─── */}
      <div className="ambient-glow" style={{ top: '-20%', left: '-10%', width: '650px', height: '650px', background: '#4338CA', opacity: 0.5 }} />
      <div className="ambient-glow" style={{ top: '10%', right: '-15%', width: '550px', height: '550px', background: '#38BDF8', opacity: 0.1 }} />

      {/* ─── Sticky Glass Navbar ─── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="glass-panel"
        style={{ padding: '0 6%', height: '68px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}
      >
        {/* Logo: icon + text  */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #818CF8, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={18} color="white" />
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            BotFlow<span style={{ color: 'var(--primary)' }}>.</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {[['#features', 'Features'], ['#pricing', 'Pricing'], ['/how-it-works', 'How it Works']].map(([href, label]) => (
            <Link key={href} href={href} className={styles.navLink}>{label}</Link>
          ))}
        </nav>

        <Link href="/login" className={styles.secondaryBtn} style={{ padding: '8px 18px', fontSize: '14px' }}>
          Dashboard Login
        </Link>
      </motion.header>

      {/* ─── HERO ─── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', zIndex: 10, overflow: 'hidden' }}>
        {/* Subtle grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', zIndex: 0, pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 2, maxWidth: '860px', margin: '0 auto' }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', padding: '6px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '700', marginBottom: '32px', border: '1px solid rgba(129,140,248,0.25)', color: '#A5B4FC', letterSpacing: '0.02em' }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', flexShrink: 0, display: 'inline-block' }} />
            The #1 AI Chatbot for Sales & Support
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 80 }}
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: '900', lineHeight: 1.07, marginBottom: '28px', letterSpacing: '-0.03em', color: '#F8FAFC' }}
          >
            Turn website visitors <br />
            into <span className="text-gradient-primary">paying customers.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: '19px', color: '#94A3B8', maxWidth: '580px', margin: '0 auto 44px', lineHeight: 1.75 }}
          >
            Deploy an AI-powered chatbot trained on <em style={{ color: '#C7D2FE', fontStyle: 'normal', fontWeight: '600' }}>your data</em> in under 10 minutes. Capture leads, answer questions, and close deals — 24/7.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}
          >
            <Link href="/login" className={styles.primaryBtn} style={{ padding: '15px 32px', fontSize: '16px' }}>
              Start for Free — No Credit Card
              <ChevronRight size={20} />
            </Link>
            <Link href="/how-it-works" className={styles.secondaryBtn} style={{ padding: '15px 28px', fontSize: '16px' }}>
              See How it Works
            </Link>
          </motion.div>
        </motion.div>

        {/* ─── Dashboard Mockup ─── */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18, delay: 0.7 }}
          style={{ marginTop: '72px', width: '100%', maxWidth: '1050px', position: 'relative', zIndex: 2 }}
        >
          <div style={{ position: 'absolute', inset: '-30px', background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(99,102,241,0.18) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)', padding: '5px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
            {/* Browser chrome */}
            <div style={{ background: '#09090b', borderRadius: '13px 13px 0 0', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#EF4444', '#F59E0B', '#10B981'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '4px 12px', fontSize: '12px', color: '#64748B', textAlign: 'center', maxWidth: '340px', margin: '0 auto' }}>
                chat-bot.vercel.app/dashboard
              </div>
            </div>

            {/* Dashboard UI */}
            <div style={{ background: '#020617', borderRadius: '0 0 13px 13px', display: 'flex', overflow: 'hidden', height: '440px' }}>
              {/* Sidebar */}
              <div style={{ width: '188px', background: '#09090b', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 10px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', paddingLeft: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: 'linear-gradient(135deg, #818CF8, #C084FC)', flexShrink: 0 }} />
                  <span style={{ fontWeight: '800', fontSize: '13px', color: 'white', letterSpacing: '-0.02em' }}>BotFlow.</span>
                </div>
                {['Overview', 'My Chatbots', 'Knowledge', 'CRM Leads', 'Live Chat'].map((item, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', marginBottom: '2px', background: i === 0 ? 'rgba(99,102,241,0.12)' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', borderLeft: i === 0 ? '2px solid #818CF8' : '2px solid transparent' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: i === 0 ? '#818CF8' : '#334155' }} />
                    <span style={{ fontSize: '12px', color: i === 0 ? '#C7D2FE' : '#475569', fontWeight: i === 0 ? '600' : '400' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'hidden', background: '#020617' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '3px' }}>Overview</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Track your chatbot's performance and leads</div>
                </div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  {[{ label: 'Total Leads', value: '247', c: '#10B981' }, { label: 'Knowledge Items', value: '18', c: '#818CF8' }, { label: 'Chat Sessions', value: '1,482', c: '#F59E0B' }].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px', borderLeft: `3px solid ${s.c}` }}>
                      <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{s.label}</div>
                      <div style={{ fontSize: '26px', fontWeight: '800', color: '#F1F5F9' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Leads table */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#CBD5E1' }}>Recent CRM Leads</span>
                    <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: '600' }}>View All →</span>
                  </div>
                  {[{ name: 'Ali Hassan', email: 'ali@store.com', status: 'New Lead', sc: '#10B981', sb: 'rgba(16,185,129,0.12)' }, { name: 'Sara Sheikh', email: 'sara@business.pk', status: 'Contacted', sc: '#F59E0B', sb: 'rgba(245,158,11,0.12)' }, { name: 'Kamran Malik', email: 'kamran@co.com', status: 'New Lead', sc: '#10B981', sb: 'rgba(16,185,129,0.12)' }].map((lead, i) => (
                    <div key={i} style={{ padding: '9px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #818CF8, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{lead.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#E2E8F0' }}>{lead.name}</div>
                        <div style={{ fontSize: '11px', color: '#475569' }}>{lead.email}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '50px', background: lead.sb, color: lead.sc, border: `1px solid ${lead.sc}30` }}>{lead.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Trusted By Tools ─── */}
      <section style={{ padding: '56px 6%', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-page)' }}>
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', color: '#475569', fontSize: '11px', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '36px' }}
        >
          Works with your existing tools
        </motion.p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', alignItems: 'center' }}>
          {LOGOS.map((logo, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: logo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '13px', color: 'white' }}>{logo.letter}</div>
              <span style={{ color: '#64748B', fontWeight: '600', fontSize: '15px' }}>{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features Bento ─── */}
      <section id="features" style={{ padding: '120px 6%', position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '16px', color: '#F8FAFC' }}>
            Everything you need to <span className="text-gradient-primary">convert visitors</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#64748B', maxWidth: '500px', margin: '0 auto' }}>One powerful platform to handle your entire customer engagement funnel.</p>
        </motion.div>

        {/* Clean 3-col equal grid — no large/small spans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 100 }}
              style={{ background: 'rgba(15,23,42,0.8)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)', padding: '28px', transition: 'border-color 0.3s, transform 0.3s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
              whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.15)' }}
            >
              {/* Subtle top glow */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '1px', background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`, zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `rgba(${f.rgb},0.12)`, border: `1px solid rgba(${f.rgb},0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '20px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: '#F1F5F9', letterSpacing: '-0.02em' }}>{f.title}</h3>
                <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.7' }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section style={{ padding: '100px 6%', position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-page)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '900', letterSpacing: '-0.04em', color: '#F8FAFC' }}>
              Trusted by businesses <span className="text-gradient-primary">like yours</span>
            </h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '28px 32px' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                  {[...Array(t.stars)].map((_, j) => <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />)}
                </div>
                <p style={{ color: '#CBD5E1', fontSize: '15px', lineHeight: '1.7', marginBottom: '24px', fontWeight: '500' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #818CF8, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', color: 'white', flexShrink: 0 }}>{t.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#F1F5F9' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Industry Demo Section ─── */}
      <section style={{ padding: '100px 6%', position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-page)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(203,168,118,0.1)', padding: '5px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', color: '#cba876', marginBottom: '20px', border: '1px solid rgba(203,168,118,0.25)' }}>
              <Sparkles size={13} /> Live Industry Demos
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '16px', color: '#F8FAFC' }}>
              See BotFlow AI <span className="text-gradient-primary">working live</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#64748B', maxWidth: '520px', margin: '0 auto' }}>
              Real chatbots, deployed on real websites. Click to experience the bot yourself.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* Real Estate Demo Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 80 }}
              style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(203,168,118,0.2)', borderRadius: '22px', overflow: 'hidden', transition: 'all 0.3s' }}
              whileHover={{ y: -8, borderColor: 'rgba(203,168,118,0.5)', boxShadow: '0 20px 60px rgba(203,168,118,0.1)' }}
            >
              {/* Preview Banner */}
              <div style={{ height: '180px', background: 'linear-gradient(135deg, #0f1115 0%, #1a1208 50%, #0f1115 100%)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(203,168,118,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(203,168,118,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '200px', background: '#cba876', filter: 'blur(80px)', opacity: 0.12 }} />
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏠</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', letterSpacing: '2px' }}>LUXE<span style={{ color: '#cba876' }}>REALTY</span></div>
                  <div style={{ fontSize: '11px', color: '#cba876', letterSpacing: '3px', marginTop: '4px', textTransform: 'uppercase' }}>Luxury Real Estate</div>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '50px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>LIVE DEMO</span>
                </div>
              </div>

              {/* Card Content */}
              <div style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ background: 'rgba(203,168,118,0.12)', border: '1px solid rgba(203,168,118,0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#cba876', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Real Estate
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '8px', letterSpacing: '-0.02em' }}>Luxe Realty — Property Assistant</h3>
                <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                  AI trained on 24 luxury property listings, agent bios, and company info. Answers buyer questions, qualifies leads, and books viewings automatically.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['Property Search', 'Lead Capture', 'Agent Info'].map((tag, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', padding: '3px 10px', fontSize: '11px', color: '#94A3B8' }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div style={{ padding: '0 28px 28px' }}>
                <a href="https://real-state-23j6.vercel.app/" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #cba876, #b3915f)', color: '#0f1115', fontWeight: '800', fontSize: '14px', textDecoration: 'none', transition: 'all 0.3s', letterSpacing: '0.02em' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Globe size={16} /> Visit Live Demo
                </a>
              </div>
            </motion.div>

            {/* NOVA E-Commerce Demo Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 80 }}
              style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '22px', overflow: 'hidden', transition: 'all 0.3s' }}
              whileHover={{ y: -8, borderColor: 'rgba(124,58,237,0.5)', boxShadow: '0 20px 60px rgba(124,58,237,0.1)' }}
            >
              {/* Preview Banner */}
              <div style={{ height: '180px', background: 'linear-gradient(135deg, #0a0514 0%, #0d0d1a 50%, #050a14 100%)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '200px', background: '#7C3AED', filter: 'blur(80px)', opacity: 0.15 }} />
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛍️</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: 'white', letterSpacing: '4px' }}>N<span style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>OVA</span></div>
                  <div style={{ fontSize: '11px', color: '#8B5CF6', letterSpacing: '3px', marginTop: '4px', textTransform: 'uppercase' }}>Premium Fashion & Lifestyle</div>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '50px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '700' }}>LIVE DEMO</span>
                </div>
              </div>

              {/* Card Content */}
              <div style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    E-Commerce
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '8px', letterSpacing: '-0.02em' }}>NOVA Fashion — Shopping Assistant</h3>
                <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                  AI trained on 1,200+ fashion products, brand story, and policies. Helps customers find styles, check sizes, apply promo codes, and complete purchases.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Product Finder', 'Size Guide', 'Promo Codes'].map((tag, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', padding: '3px 10px', fontSize: '11px', color: '#94A3B8' }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div style={{ padding: '0 28px 28px' }}>
                <a href="https://real-state-nbje.vercel.app" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white', fontWeight: '800', fontSize: '14px', textDecoration: 'none', transition: 'all 0.3s', letterSpacing: '0.02em' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Globe size={16} /> Visit Live Demo
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}

      <section id="pricing" style={{ padding: '100px 6%', position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-page)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '14px', color: '#F8FAFC' }}>Simple, transparent pricing</h2>
            <p style={{ color: '#64748B', fontSize: '17px' }}>Cancel anytime. No hidden fees.</p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', textAlign: 'left' }}>
            {/* Starter */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              style={{ background: 'rgba(15,23,42,0.9)', padding: '36px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}
              whileHover={{ y: -6, borderColor: 'rgba(255,255,255,0.16)' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px', color: '#F8FAFC' }}>Starter</h3>
              <p style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>Perfect for small businesses.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', fontWeight: '900', color: '#F8FAFC', letterSpacing: '-0.04em' }}>$29</span>
                <span style={{ fontSize: '14px', color: '#475569' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', flex: 1 }}>
                {['1 AI Chatbot', 'Unlimited Knowledge Training', 'Up to 100 Leads/month', 'Email Support'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#94A3B8" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '14px', color: '#94A3B8' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className={styles.pricingBtn}>Get Started <ArrowRight size={15} /></Link>
            </motion.div>

            {/* Pro */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              style={{ background: 'linear-gradient(160deg, rgba(30,27,60,1) 0%, rgba(15,23,42,1) 100%)', padding: '36px', borderRadius: '22px', border: '1px solid rgba(129,140,248,0.3)', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 40px rgba(99,102,241,0.12)', transition: 'all 0.3s' }}
              whileHover={{ y: -6, boxShadow: '0 0 60px rgba(99,102,241,0.22)' }}>
              <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #818CF8, #C084FC)', color: 'white', padding: '4px 16px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>MOST POPULAR</div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px', color: '#F8FAFC' }}>Pro</h3>
              <p style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>For growing teams & agencies.</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', fontWeight: '900', color: '#F8FAFC', letterSpacing: '-0.04em' }}>$79</span>
                <span style={{ fontSize: '14px', color: '#475569' }}>/month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', flex: 1 }}>
                {['3 AI Chatbots', 'Unlimited Knowledge Training', 'Unlimited Leads Capture', 'Live Human Takeover', 'Remove BotFlow Branding', 'Priority WhatsApp Support'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#818CF8" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '14px', color: i >= 2 ? '#E2E8F0' : '#94A3B8', fontWeight: i >= 2 ? '600' : '400' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" className={`${styles.pricingBtn} ${styles.pricingBtnPro}`}>Choose Pro <ArrowRight size={15} /></Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section style={{ padding: '60px 6% 100px', position: 'relative', zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: '900px', margin: '0 auto', borderRadius: '24px', padding: '64px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(129,140,248,0.2)', boxShadow: '0 0 60px rgba(99,102,241,0.1)' }}
        >
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '300px', background: '#4338CA', filter: 'blur(100px)', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(129,140,248,0.12)', padding: '5px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', color: '#818CF8', marginBottom: '24px', border: '1px solid rgba(129,140,248,0.2)' }}>
              <Sparkles size={13} /> Limited Offer — 15-Day Free Trial
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '18px', color: '#F8FAFC' }}>
              Ready to automate your growth?
            </h2>
            <p style={{ fontSize: '17px', color: '#64748B', marginBottom: '36px', maxWidth: '440px', margin: '0 auto 36px' }}>
              Join hundreds of businesses that never miss a lead again.
            </p>
            <Link href="/login" className={styles.primaryBtn} style={{ padding: '16px 40px', fontSize: '16px' }}>
              Get Started Free <ChevronRight size={20} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 6%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-page)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #818CF8, #C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={14} color="white" />
          </div>
          <span style={{ fontSize: '15px', fontWeight: '800', color: '#334155', letterSpacing: '-0.02em' }}>BotFlow<span style={{ color: 'var(--primary)' }}>.</span></span>
        </div>
        <p style={{ color: '#334155', fontSize: '13px' }}>&copy; {new Date().getFullYear()} BotFlow AI — All rights reserved.</p>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[['/how-it-works', 'How it Works'], ['/login', 'Dashboard']].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#475569', fontSize: '13px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#94A3B8'}
              onMouseLeave={e => e.target.style.color = '#475569'}>{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
