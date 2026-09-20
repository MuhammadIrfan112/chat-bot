'use client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Zap, Shield, ChevronRight, Check, ArrowRight, Sparkles, 
  Globe, Star, Calendar, MessageSquare, Flame, PhoneCall, 
  DollarSign, Calculator, Home as HomeIcon, MapPin, Bed, Bath, Maximize2
} from 'lucide-react';
import styles from './page.module.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const REAL_ESTATE_LOGOS = [
  { name: 'Realtor.ca Sync', icon: '🇨🇦' },
  { name: 'Zillow MLS Data', icon: '🇺🇸' },
  { name: 'Follow Up Boss', icon: '💼' },
  { name: 'Google Calendar', icon: '📅' },
  { name: 'kvCORE / BoldTrail', icon: '⚡' },
  { name: 'Any Website Embed', icon: '🌐' },
];

const RE_TESTIMONIALS = [
  { 
    name: 'Marcus Vance', 
    role: 'Luxury Broker — Toronto & GTA', 
    text: 'We captured two buyers at 11:30 PM who were browsing our listings. The AI showed them live luxury properties, qualified their $1.4M budget, and booked private tours for Sunday. Outstanding ROI.', 
    stars: 5,
    deal: 'Closed $1.4M Deal'
  },
  { 
    name: 'Elena Rostova', 
    role: 'Top 1% Producing Realtor', 
    text: 'Normal website forms are dead. Buyers want answers now. RealtyPropFlow AI gives them real-time property photos, square footage, and pricing in seconds. It paid for itself in week one.', 
    stars: 5,
    deal: '3x More Buyer Leads'
  },
  { 
    name: 'David Sterling', 
    role: 'Brokerage Team Lead — 18 Agents', 
    text: 'The live takeover feature is a game-changer. When a pre-approved buyer asks to put an offer, my agents get an instant ping and step into the chat from their phone. Best $99 we spend every month.', 
    stars: 5,
    deal: '15+ Tours Booked / Mo'
  },
];

const INTERACTIVE_PROMPTS = [
  {
    question: "Show me 3-bed homes in Toronto under $1M",
    reply: "Here is a newly listed 3-bedroom luxury property matching your criteria in Downtown Toronto:",
    property: {
      title: "The King West Penthouse",
      address: "180 King St W, Toronto, ON",
      price: "$895,000",
      beds: 3,
      baths: 2,
      sqft: "1,450 sqft",
      tag: "Just Listed • MLS® Verified",
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop"
    },
    actionText: "Book Private Showing Tomorrow at 2:00 PM",
    leadTag: "🔥 Hot Buyer Lead — Budget: $1M (Pre-Approved)"
  },
  {
    question: "Can I schedule a private tour for tomorrow?",
    reply: "Absolutely! I have private showing slots available with the listing agent tomorrow:",
    property: {
      title: "Crystal Bay Waterfront Estate",
      address: "55 Lakefront Way, Lake Tahoe",
      price: "$1,850,000",
      beds: 4,
      baths: 4,
      sqft: "3,200 sqft",
      tag: "Private Viewings Available",
      img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop"
    },
    actionText: "Confirm Tour: Saturday @ 11:30 AM",
    leadTag: "📅 Tour Scheduled & Synced to Agent Calendar"
  },
  {
    question: "What is my home's estimated market value?",
    reply: "I can run an instant MLS comparative market analysis (CMA). What is your property address and bedroom count?",
    property: {
      title: "Free Instant Home Valuation (CMA)",
      address: "Local Market Median: +8.4% Year-over-Year",
      price: "Instant Report",
      beds: "Any",
      baths: "Any",
      sqft: "Full Comp",
      tag: "Seller Lead Qualifier",
      img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop"
    },
    actionText: "Send Free Valuation to My Email",
    leadTag: "🏠 High-Intent Seller Lead Captured"
  }
];

export default function Home() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installStatus, setInstallStatus] = useState('idle');
  const [installForm, setInstallForm] = useState({ 
    name: '', phone: '', installTime: '', techInfo: '', websiteType: '', hasHostingAccess: '', hostingUser: '', hostingPass: '' 
  });

  // ROI Calculator State
  const [avgPrice, setAvgPrice] = useState(750000);
  const [commissionRate, setCommissionRate] = useState(2.5);

  const potentialCommission = (avgPrice * (commissionRate / 100));
  const annualInvestment = 99 * 12; // $1,188/yr
  const netProfit = potentialCommission - annualInvestment;
  const roiPercentage = Math.round((netProfit / annualInvestment) * 100);

  // ── Auto-redirect logged-in users to dashboard ────────────────
  useEffect(() => {
    const isViewWebsite = window.location.search.includes('view=website');
    if (isViewWebsite) {
      setAuthChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        setAuthChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = '/dashboard';
      } else {
        setAuthChecking(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (authChecking) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#07090E' }} />;
  }

  const activeDemo = INTERACTIVE_PROMPTS[activePromptIdx];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#07090E', color: '#F1F5F9', overflowX: 'hidden' }}>

      {/* ─── Ambient Glow Accents ─── */}
      <div style={{ position: 'fixed', top: '-15%', left: '15%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(229,193,88,0.07) 0%, rgba(79,70,229,0.04) 50%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ─── Sticky Glass Navbar ─── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          padding: '0 6%',
          height: '74px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(7, 9, 14, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src="/logo-icon.png" alt="RealtyPropFlow Logo" style={{ height: '44px', width: '44px', objectFit: 'contain' }} />
          <span style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            RealtyPropFlow<span style={{ color: '#E5C158', fontSize: '24px', lineHeight: 1 }}>.</span>
          </span>
        </Link>

        <nav className={styles.desktopOnly} style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {[
            ['#demo', 'Live AI Demo'],
            ['#features', 'Features'],
            ['#roi', 'ROI Calculator'],
            ['#pricing', 'Pricing ($99)'],
            ['#reviews', 'Testimonials'],
            ['#contact', 'Contact'],
          ].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '14px', fontWeight: '600', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E5C158'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.desktopOnly} style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#E2E8F0', padding: '9px 18px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
            Client Login
          </Link>
          <Link href="/login" style={{
            background: 'linear-gradient(135deg, #E5C158 0%, #D4AF37 100%)',
            color: '#07090E',
            padding: '10px 22px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 20px rgba(229,193,88,0.25)',
            transition: 'all 0.2s'
          }}>
            Get Started <ArrowRight size={15} />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button 
          className={`${styles.hamburger} ${mobileMenuOpen ? styles.open : ''}`} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          aria-label="Toggle menu"
          style={{ background: 'none', border: 'none', color: '#E5C158', cursor: 'pointer' }}
        >
          <span></span><span></span><span></span>
        </button>
      </motion.header>

      {/* ─── Mobile Drawer ─── */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, top: '74px', background: '#07090E', zIndex: 99, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[['#demo', 'Live AI Demo'], ['#features', 'Features'], ['#roi', 'ROI Calculator'], ['#pricing', 'Pricing ($99)'], ['#contact', 'Contact']].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '18px', fontWeight: '700', color: '#F1F5F9', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {label}
            </Link>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ textAlign: 'center', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'white', textDecoration: 'none', fontWeight: '700' }}>Login</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ textAlign: 'center', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #E5C158, #D4AF37)', color: 'black', textDecoration: 'none', fontWeight: '800' }}>Get Started ($99/mo)</Link>
          </div>
        </div>
      )}

      {/* ─── HERO SECTION ─── */}
      <section style={{ paddingTop: '150px', paddingBottom: '90px', paddingLeft: '6%', paddingRight: '6%', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '100px',
              background: 'rgba(229,193,88,0.1)',
              border: '1px solid rgba(229,193,88,0.3)',
              color: '#E5C158',
              fontSize: '13px',
              fontWeight: '700',
              marginBottom: '28px',
              letterSpacing: '0.02em'
            }}
          >
            <Sparkles size={14} color="#E5C158" />
            The 24/7 AI Real Estate Agent for Top Producers
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 'clamp(38px, 5.5vw, 68px)',
              fontWeight: '900',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              maxWidth: '960px',
              margin: '0 auto 24px'
            }}
          >
            Close More Listings While You Sleep. <br />
            <span style={{
              background: 'linear-gradient(135deg, #FFF0B8 0%, #E5C158 50%, #C9A227 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Shows Live Homes &amp; Books Private Tours.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: 'clamp(17px, 2vw, 20px)',
              color: '#94A3B8',
              maxWidth: '720px',
              margin: '0 auto 40px',
              lineHeight: 1.6
            }}
          >
            RealtyPropFlow AI connects to live MLS data (Realtor.ca &amp; Zillow), answers buyer inquiries instantly with rich property photos, qualifies hot leads, and books showings straight into your calendar.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}
          >
            <Link href="/login" style={{
              background: 'linear-gradient(135deg, #E5C158 0%, #D4AF37 100%)',
              color: '#07090E',
              padding: '16px 36px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 30px rgba(229,193,88,0.3)',
              transition: 'all 0.2s'
            }}>
              Start 30-Day Free Trial — $99/mo <ArrowRight size={18} />
            </Link>

            <a href="#demo" style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#E2E8F0',
              padding: '16px 28px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '700',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(10px)'
            }}>
              Try Live Interactive Demo ↓
            </a>
          </motion.div>

          {/* Social Proof Line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', color: '#64748B', fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: '700' }}>
              <Check size={16} /> Instant 10-Min Setup
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1', fontWeight: '600' }}>
              <Check size={16} color="#10B981" /> Works On Any Agent Website
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1', fontWeight: '600' }}>
              <Check size={16} color="#10B981" /> No Technical Skills Required
            </span>
          </div>

        </div>
      </section>

      {/* ─── LIVE INTERACTIVE HERO CENTERPIECE (THE WOW FACTOR) ─── */}
      <section id="demo" style={{ padding: '0 6% 90px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          
          <div style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 26, 0.95) 100%)',
            borderRadius: '28px',
            border: '1px solid rgba(229,193,88,0.3)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 60px rgba(229,193,88,0.08)',
            overflow: 'hidden',
            backdropFilter: 'blur(30px)'
          }}>

            {/* Window Chrome Header */}
            <div style={{
              padding: '14px 20px',
              background: '#0B0F17',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: '700', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏡 RealtyPropFlow AI Assistant — Live Interaction
                </span>
              </div>
              <div style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                LIVE ON AGENT WEBSITE
              </div>
            </div>

            {/* Interactive Prompt Selector Tabs */}
            <div style={{
              padding: '16px 20px',
              background: 'rgba(0,0,0,0.3)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              gap: '10px',
              overflowX: 'auto'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'flex', alignItems: 'center', marginRight: '6px', flexShrink: 0 }}>
                Try Asking:
              </span>
              {INTERACTIVE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePromptIdx(i)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '50px',
                    fontSize: '13px',
                    fontWeight: activePromptIdx === i ? '800' : '600',
                    cursor: 'pointer',
                    border: activePromptIdx === i ? '1px solid #E5C158' : '1px solid rgba(255,255,255,0.08)',
                    background: activePromptIdx === i ? 'rgba(229,193,88,0.15)' : 'rgba(255,255,255,0.02)',
                    color: activePromptIdx === i ? '#E5C158' : '#94A3B8',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  "{p.question}"
                </button>
              ))}
            </div>

            {/* Chat Conversation Body */}
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* User Message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #4F46E5, #3B82F6)',
                  color: 'white',
                  padding: '14px 20px',
                  borderRadius: '18px 18px 4px 18px',
                  maxWidth: '540px',
                  fontSize: '15px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(79,70,229,0.25)'
                }}>
                  {activeDemo.question}
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>
                  👤
                </div>
              </div>

              {/* Bot Response Message with Property Card */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #E5C158, #D4AF37)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#07090E',
                  fontWeight: '900',
                  fontSize: '16px',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(229,193,88,0.3)'
                }}>
                  🤖
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '620px', width: '100%' }}>
                  
                  {/* Bot text bubble */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#E2E8F0',
                    padding: '14px 20px',
                    borderRadius: '18px 18px 18px 4px',
                    fontSize: '15px',
                    lineHeight: 1.6
                  }}>
                    {activeDemo.reply}
                  </div>

                  {/* Real Estate Property Card Embedded inside Chat */}
                  <motion.div
                    key={activeDemo.property.title}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: '#0F172A',
                      borderRadius: '18px',
                      border: '1px solid rgba(229,193,88,0.3)',
                      overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                      <img
                        src={activeDemo.property.img}
                        alt={activeDemo.property.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '800', color: '#E5C158', border: '1px solid rgba(229,193,88,0.4)' }}>
                        {activeDemo.property.tag}
                      </div>
                      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: '#10B981', color: 'white', padding: '6px 14px', borderRadius: '10px', fontWeight: '900', fontSize: '18px', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
                        {activeDemo.property.price}
                      </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                        {activeDemo.property.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '13px', marginBottom: '16px' }}>
                        <MapPin size={14} color="#E5C158" /> {activeDemo.property.address}
                      </div>

                      {/* Specs */}
                      <div style={{ display: 'flex', gap: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#CBD5E1' }}>
                          <Bed size={15} color="#60A5FA" /> {activeDemo.property.beds} Beds
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#CBD5E1' }}>
                          <Bath size={15} color="#34D399" /> {activeDemo.property.baths} Baths
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#CBD5E1' }}>
                          <Maximize2 size={15} color="#FBBF24" /> {activeDemo.property.sqft}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => alert(`Simulating tour booking for ${activeDemo.property.title}! This syncs straight to the agent's Google Calendar.`)}
                        style={{
                          width: '100%',
                          padding: '13px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: 'white',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Calendar size={16} /> {activeDemo.actionText}
                      </button>

                    </div>
                  </motion.div>

                  {/* Qualification notification pill */}
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#34D399',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {activeDemo.leadTag}
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── INTEGRATIONS & PLATFORMS BAR ─── */}
      <section style={{ padding: '40px 6%', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#05070A' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '24px' }}>
            Built specifically to integrate with real estate workflows &amp; CRMs
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '36px', flexWrap: 'wrap', alignItems: 'center' }}>
            {REAL_ESTATE_LOGOS.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '15px', fontWeight: '700' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4 CORE REAL ESTATE PILLARS ─── */}
      <section id="features" style={{ padding: '120px 6%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '70px' }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '50px', background: 'rgba(229,193,88,0.1)', color: '#E5C158', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Engineered For High-Volume Agents
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.03em', margin: 0 }}>
            Everything you need to turn clicks into commission.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          
          {/* Pillar 1 */}
          <div style={{ background: '#0B0F17', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(229,193,88,0.12)', border: '1px solid rgba(229,193,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <HomeIcon size={26} color="#E5C158" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px' }}>
              Live MLS &amp; Listings Showcase
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              Connects directly to your property database, Realtor.ca, or Zillow. When a buyer asks about price, bedrooms, or neighborhood, the AI pulls actual high-res photos and live MLS specs in seconds.
            </p>
          </div>

          {/* Pillar 2 */}
          <div style={{ background: '#0B0F17', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Flame size={26} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px' }}>
              Automatic Lead Qualification
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              Never waste time on tire-kickers. The AI qualifies buyer readiness: pre-approval status, purchase timeline, and budget. Leads are graded as <strong>Hot, Warm, or Cold</strong> and sent straight to your CRM.
            </p>
          </div>

          {/* Pillar 3 */}
          <div style={{ background: '#0B0F17', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Calendar size={26} color="#10B981" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px' }}>
              Instant Showing &amp; Tour Booking
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              Allows buyers to book private tours on the spot. Synced directly with your Google Calendar to prevent double-booking, with automated SMS/email reminders sent to both you and the client.
            </p>
          </div>

          {/* Pillar 4 */}
          <div style={{ background: '#0B0F17', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <PhoneCall size={26} color="#818CF8" />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', marginBottom: '12px' }}>
              Live Human Agent Takeover
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
              When a buyer says *"I want to put an offer tonight"*, you get an urgent push notification on your mobile phone. With one tap, pause the AI and chat directly with the buyer to lock in the deal.
            </p>
          </div>

        </div>
      </section>

      {/* ─── INTERACTIVE REAL ESTATE ROI CALCULATOR ─── */}
      <section id="roi" style={{ padding: '0 6% 120px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{
            background: 'linear-gradient(135deg, #0D131F 0%, #07090E 100%)',
            borderRadius: '28px',
            border: '2px solid rgba(229,193,88,0.35)',
            padding: 'clamp(32px, 5vw, 56px)',
            boxShadow: '0 20px 70px rgba(0,0,0,0.8), 0 0 50px rgba(229,193,88,0.1)'
          }}>

            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '50px', background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '14px' }}>
                <Calculator size={14} /> Calculate Your Real Estate ROI
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                See How Fast 1 Deal Pays For The Whole Year
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'center' }}>
              
              {/* Sliders Side */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                
                {/* Slider 1: Average Price */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#CBD5E1' }}>Average Home Sale Price:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#E5C158' }}>${avgPrice.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="300000"
                    max="2500000"
                    step="25000"
                    value={avgPrice}
                    onChange={e => setAvgPrice(Number(e.target.value))}
                    style={{ width: '100%', height: '8px', borderRadius: '5px', accentColor: '#E5C158', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    <span>$300,000</span>
                    <span>$2,500,000+</span>
                  </div>
                </div>

                {/* Slider 2: Commission Rate */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#CBD5E1' }}>Your Commission Rate:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#E5C158' }}>{commissionRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="5.0"
                    step="0.1"
                    value={commissionRate}
                    onChange={e => setCommissionRate(Number(e.target.value))}
                    style={{ width: '100%', height: '8px', borderRadius: '5px', accentColor: '#E5C158', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    <span>1.5%</span>
                    <span>5.0%</span>
                  </div>
                </div>

              </div>

              {/* ROI Output Card */}
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '20px',
                border: '1px solid rgba(229,193,88,0.25)',
                padding: '36px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Commission On Just 1 Extra Closing
                </div>
                <div style={{ fontSize: '48px', fontWeight: '900', color: '#10B981', lineHeight: 1, marginBottom: '12px' }}>
                  +${Math.round(potentialCommission).toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '20px' }}>
                  PropFlow AI Full Year Cost: <strong style={{ color: '#E5C158' }}>$1,188</strong> ($99/mo)
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '14px' }}>Net Extra Profit:</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>+${Math.round(netProfit).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                  <span style={{ color: '#94A3B8', fontSize: '14px' }}>Estimated ROI:</span>
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>{roiPercentage}% ROI</span>
                </div>

                <Link href="/login" style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #E5C158, #D4AF37)',
                  color: '#07090E',
                  fontWeight: '800',
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(229,193,88,0.3)'
                }}>
                  Claim Your 30-Day Free Trial →
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── REAL ESTATE AGENT TESTIMONIALS ─── */}
      <section id="reviews" style={{ padding: '0 6% 120px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '12px' }}>
              Trusted by Top 1% Realtors &amp; Brokers
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '17px' }}>Real feedback from agents who closed real deals with PropFlow AI.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {RE_TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: '#0B0F17', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[...Array(t.stars)].map((_, s) => <Star key={s} size={15} fill="#E5C158" color="#E5C158" />)}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '50px', background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                      {t.deal}
                    </span>
                  </div>
                  <p style={{ color: '#CBD5E1', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>
                    "{t.text}"
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF' }}>{t.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SINGLE TRANSPARENT $99/MO PRICING ─── */}
      <section id="pricing" style={{ padding: '0 6% 120px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{
            background: 'linear-gradient(160deg, #0F172A 0%, #080C14 100%)',
            borderRadius: '28px',
            border: '2px solid rgba(229,193,88,0.5)',
            padding: '48px 40px',
            position: 'relative',
            boxShadow: '0 0 60px rgba(229,193,88,0.15)'
          }}>
            <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #E5C158, #D4AF37)', color: '#07090E', padding: '6px 24px', borderRadius: '50px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(229,193,88,0.4)' }}>
              🏆 All-Inclusive Real Estate AI Plan
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px', marginTop: '10px' }}>
              PropFlow AI Pro
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '15px', marginBottom: '28px' }}>
              Everything your real estate business needs to capture, qualify, and close buyers 24/7.
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '64px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.04em' }}>$99</span>
              <span style={{ fontSize: '18px', color: '#64748B', fontWeight: '600' }}>/month</span>
            </div>
            <p style={{ fontSize: '13px', color: '#E5C158', fontWeight: '600', marginBottom: '32px' }}>
              Billed monthly via Paddle • Cancel anytime • 30-Day Free Trial
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left', marginBottom: '36px' }}>
              {[
                '1 Custom-Trained Real Estate AI Chatbot',
                'Live MLS Property Listings Showing (Photos, Price, Specs)',
                'Automated Showing & Private Tour Calendar Booking',
                'Intelligent Lead Qualification (Hot, Warm, Cold Tags)',
                'Instant Live Agent Human Takeover Alert on Mobile',
                'Unlimited Conversations & Buyer Inquiries',
                'Works on Any Platform (WordPress, Squarespace, Custom)',
                'Dedicated 24/7 Setup & Integration Support'
              ].map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(229,193,88,0.15)', border: '1px solid rgba(229,193,88,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#E5C158" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '15px', color: '#E2E8F0', fontWeight: '500' }}>{feature}</span>
                </div>
              ))}
            </div>

            <Link href="/login" style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #E5C158 0%, #D4AF37 100%)',
              color: '#07090E',
              fontWeight: '900',
              fontSize: '17px',
              textDecoration: 'none',
              boxShadow: '0 8px 30px rgba(229,193,88,0.3)',
              transition: 'all 0.2s'
            }}>
              Start Your 30-Day Free Trial Now →
            </Link>

            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '16px' }}>
              🔒 Secure payment processed by Paddle. No contracts, cancel anytime.
            </div>
          </div>

        </div>
      </section>

      {/* ─── DONE-FOR-YOU INSTALLATION BANNER ─── */}
      <section style={{ padding: '0 6% 100px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A0E17 0%, #151A26 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#E5C158', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Need Help Setting It Up?
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 8px 0' }}>
                We Can Install It On Your Website For You
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '15px', margin: 0, maxWidth: '560px' }}>
                Don't have time to paste code? Our technical engineers will configure, test, and embed the chatbot on your agent website in under 24 hours.
              </p>
            </div>

            <button
              onClick={() => { setShowInstallModal(true); setInstallStatus('idle'); }}
              style={{
                background: '#10B981',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              Request Free Installation
            </button>
          </div>
        </div>
      </section>

      {/* ─── INSTALLATION REQUEST MODAL ─── */}
      {showInstallModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowInstallModal(false); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: '#0D131F', border: '1px solid rgba(229,193,88,0.3)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
          >
            <button onClick={() => setShowInstallModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: '#64748B', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>✕</button>

            {installStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#F1F5F9', marginBottom: '12px' }}>Request Received!</h3>
                <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: 1.6 }}>Our technical team will contact you shortly to get your chatbot installed and live.</p>
                <button onClick={() => setShowInstallModal(false)} style={{ marginTop: '24px', padding: '12px 28px', borderRadius: '50px', background: '#E5C158', color: 'black', border: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Close</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#F1F5F9', marginBottom: '6px' }}>Get Your Chatbot Installed</h3>
                <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '28px' }}>Fill in your details below and our team will set it up for you within 24 hours.</p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setInstallStatus('submitting');
                  try {
                    const response = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'installation', ...installForm }),
                    });
                    if (response.ok) {
                      setInstallStatus('success');
                    } else {
                      alert('Failed to submit. Please try again.');
                      setInstallStatus('idle');
                    }
                  } catch (error) {
                    alert('Error submitting form.');
                    setInstallStatus('idle');
                  }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>Full Name *</label>
                    <input required type="text" placeholder="Sarah Jenkins" value={installForm.name} onChange={e => setInstallForm(p => ({...p, name: e.target.value}))} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>Phone / WhatsApp *</label>
                    <input required type="tel" placeholder="+1 (416) 555-0192" value={installForm.phone} onChange={e => setInstallForm(p => ({...p, phone: e.target.value}))} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>Agent Website URL *</label>
                    <input required type="text" placeholder="https://yourrealtywebsite.com" value={installForm.techInfo} onChange={e => setInstallForm(p => ({...p, techInfo: e.target.value}))} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>Website Platform</label>
                    <select value={installForm.websiteType} onChange={e => setInstallForm(p => ({...p, websiteType: e.target.value}))} style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: '#07090E', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none' }}>
                      <option value="WordPress">WordPress</option>
                      <option value="Squarespace">Squarespace</option>
                      <option value="Wix">Wix</option>
                      <option value="Custom / Other">Custom / Other</option>
                    </select>
                  </div>

                  <button type="submit" disabled={installStatus === 'submitting'} style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #E5C158, #D4AF37)', color: 'black', border: 'none', fontWeight: '800', fontSize: '15px', cursor: installStatus === 'submitting' ? 'not-allowed' : 'pointer' }}>
                    {installStatus === 'submitting' ? 'Submitting...' : 'Submit Installation Request 🚀'}
                  </button>

                </form>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* ─── CONTACT SECTION ─── */}
      <section id="contact" style={{ padding: '80px 6%', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#05070A' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '12px' }}>
            Have questions before joining?
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', marginBottom: '32px' }}>
            Our real estate AI engineers are available 24/7 to answer questions and help you get started.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a href="mailto:support@realtypropflow.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#E5C158', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
              ✉️ support@realtypropflow.com
            </a>
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '12px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
              💬 WhatsApp Support
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 6%', background: '#030508' }}>
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

          <div style={{ display: 'flex', gap: '24px' }}>
            <Link href="/pricing" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Pricing ($99)</Link>
            <Link href="/login" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Login</Link>
            <Link href="#demo" style={{ color: '#94A3B8', fontSize: '13px', textDecoration: 'none' }}>Live Demo</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
