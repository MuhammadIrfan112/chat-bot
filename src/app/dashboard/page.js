'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Users, Flame, Trophy, TrendingUp, Sparkles, Clock, 
  ArrowRight, MessageSquare, Phone, AlertCircle, 
  CheckCircle2, Building, Eye, ChevronRight, CalendarDays, Settings
} from 'lucide-react';

export default function RealEstateDashboard() {
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [leads, setLeads] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const isDemo = localStorage.getItem('isDemo') === 'true';
      if (isDemo) {
        setAgentName('Demo Agent');
        setLeads([
          {
            id: 'demo-1',
            name: 'David Miller',
            phone: '+1 (416) 555-0192',
            email: 'david.m@example.com',
            status: 'New Lead',
            created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
            property_interest: '[Lead Temperature: Hot] [Lead Type: Buying Home] Looking for 3-bed detached home in Oakville, budget $1.4M.'
          },
          {
            id: 'demo-2',
            name: 'Sarah Chen',
            phone: '+1 (647) 555-8831',
            email: 'schen@example.com',
            status: 'Contacted',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            property_interest: '[Lead Temperature: Warm] [Lead Type: Selling Home] Wants market appraisal for condo downtown Toronto.'
          },
          {
            id: 'demo-3',
            name: 'Michael & Emma Ross',
            phone: '+1 (905) 555-2244',
            email: 'mross@example.com',
            status: 'Qualified',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            property_interest: '[Lead Temperature: Hot] [Lead Type: Buying Home] Pre-approved with TD Bank. Scheduled showing this weekend.'
          }
        ]);
        setUnreadCount(1);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

      // 1. Fetch Bot / Agent display info
      const { data: bots } = await supabase
        .from('bots')
        .select('id, name')
        .eq('user_id', userId);

      if (bots && bots.length > 0) {
        setAgentName(bots[0].name || '');
        const botIds = bots.map(b => b.id);

        // 2. Fetch all leads for user's bots
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*')
          .in('bot_id', botIds)
          .order('created_at', { ascending: false });

        if (leadsData) {
          setLeads(leadsData);
          const unread = leadsData.filter(l => l.status === 'New Lead').length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  // Metrics Calculations
  const totalLeads = leads.length;
  const activePipeline = leads.filter(l => ['New Lead', 'Seen', 'Contacted', 'Qualified', 'Viewing', 'Offer'].includes(l.status)).length;
  const hotLeads = leads.filter(l => 
    (l.property_interest && l.property_interest.includes('Temperature: Hot')) ||
    l.status === 'Qualified' ||
    (l.property_interest && l.property_interest.toLowerCase().includes('pre-approved'))
  ).length;
  const wonDeals = leads.filter(l => l.status === 'Closed').length;
  const conversionRate = totalLeads > 0 
    ? Math.round(((wonDeals + leads.filter(l => l.status === 'Qualified').length) / totalLeads) * 100)
    : 0;

  // Pipeline Funnel counts
  const funnelStages = [
    { label: 'New Lead', count: leads.filter(l => l.status === 'New Lead' || l.status === 'Seen').length, color: '#10B981' },
    { label: 'Contacted', count: leads.filter(l => l.status === 'Contacted').length, color: '#F59E0B' },
    { label: 'Qualified', count: leads.filter(l => l.status === 'Qualified').length, color: '#8B5CF6' },
    { label: 'Viewing', count: leads.filter(l => l.status === 'Viewing').length, color: '#3B82F6' },
    { label: 'Offer', count: leads.filter(l => l.status === 'Offer').length, color: '#EC4899' },
    { label: 'Closed', count: wonDeals, color: '#C9A227' }
  ];

  // Helper to parse lead inquiry preview
  const parseLeadPreview = (raw = '') => {
    let text = raw || 'Property inquiry from website assistant';
    let isHot = text.includes('Temperature: Hot');
    let isWarm = text.includes('Temperature: Warm');
    let type = 'Buyer Lead';
    if (text.includes('Selling Home')) type = 'Seller Lead';
    else if (text.includes('Renting Home')) type = 'Rental Lead';

    // Clean brackets
    text = text.replace(/\[Lead Temperature:\s*.*?\]/g, '')
               .replace(/\[Lead Type:\s*.*?\]/g, '')
               .replace(/Viewed Links:[\s\S]*/g, '')
               .trim();

    return { preview: text.slice(0, 110) + (text.length > 110 ? '...' : ''), isHot, isWarm, type };
  };

  // Recent 5 leads
  const recentLeads = leads.slice(0, 5);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '3px solid rgba(201,162,39,0.2)', borderTopColor: 'var(--primary)', animation: 'spin 0.9s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Loading your real estate dashboard...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Top Greeting & Status ── */}
      {/* ── Top Greeting & Status ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
        paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4.5vw, 28px)', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getGreeting()}, {agentName ? agentName.split(' ')[0] : 'Agent'}</span> <span>👋</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>{todayFormatted}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ color: unreadCount > 0 ? '#F59E0B' : 'var(--text-secondary)' }}>
              {unreadCount > 0 ? `⚡ ${unreadCount} new chatbot lead${unreadCount > 1 ? 's' : ''}` : 'All inquiries up to date'}
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/dashboard/leads" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px',
            backgroundColor: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.3)',
            color: 'var(--primary)', textDecoration: 'none', fontSize: '12px', fontWeight: '700',
            transition: 'all 0.2s'
          }}>
            <Users size={15} /> CRM Pipeline <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Quick Action Cards (CloseFlow Mobile Look) ── */}
      <div className="dashboard-quick-actions" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {[
          { label: 'CRM Leads', sub: `${leads.length} leads`, href: '/dashboard/leads', icon: <Users size={20} color="#38BDF8" />, bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)' },
          { label: 'Schedule', sub: 'Site Visits', href: '/dashboard/calendar', icon: <CalendarDays size={20} color="#EC4899" />, bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)' },
          { label: 'Properties', sub: 'Active listings', href: '/dashboard/properties', icon: <Building size={20} color="#10B981" />, bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
          { label: 'Bot Settings', sub: 'Customization', href: '/dashboard/settings', icon: <Settings size={20} color="#C9A227" />, bg: 'rgba(201,162,39,0.1)', border: 'rgba(201,162,39,0.25)' },
        ].map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '16px 12px', borderRadius: '14px',
              backgroundColor: '#1E293B', border: `1px solid ${item.border}`,
              textDecoration: 'none', transition: 'all 0.2s ease', textAlign: 'center'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.backgroundColor = 'rgba(30,41,59,0.95)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = '#1E293B';
            }}
          >
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              backgroundColor: item.bg, border: `1px solid ${item.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>{item.label}</span>
            <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{item.sub}</span>
          </Link>
        ))}
      </div>

      {/* ── 5 Core Real Estate Metric Cards ── */}
      <div className="dashboard-metrics-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
        gap: '12px', marginBottom: '28px'
      }}>

        {/* Total Leads */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Total Leads
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
              <Users size={16} />
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            {totalLeads}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Captured by AI assistant
          </div>
        </div>

        {/* Active Pipeline */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(59,130,246,0.2)', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Active Pipeline
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
              <TrendingUp size={16} />
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            {activePipeline}
          </div>
          <div style={{ fontSize: '12px', color: '#60A5FA' }}>
            In progress / follow-up
          </div>
        </div>

        {/* Hot Leads */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(239,68,68,0.25)', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hot Right Now
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
              <Flame size={16} />
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            {hotLeads}
          </div>
          <div style={{ fontSize: '12px', color: '#F87171' }}>
            High-intent buyers & sellers
          </div>
        </div>

        {/* Won / Closed */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(201,162,39,0.25)', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Won / Closed
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(201,162,39,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Trophy size={16} />
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            {wonDeals}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary)' }}>
            Completed transactions
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          border: '1px solid rgba(16,185,129,0.2)', padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Conversion
            </span>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: '12px', color: '#34D399' }}>
            Lead to engagement rate
          </div>
        </div>

      </div>

      {/* ── Middle Grid: Pipeline Funnel + Attention Hub ── */}
      <div className="dashboard-middle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', marginBottom: '28px' }}>

        {/* Pipeline Funnel */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(16px, 3vw, 24px)',
          display: 'flex', flexDirection: 'column', gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'white', margin: 0 }}>
                Real Estate Pipeline Funnel
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Active transaction lifecycle stages
              </p>
            </div>
            <Link href="/dashboard/leads" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '700' }}>
              View Pipeline ↗
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            {funnelStages.map((stage) => {
              const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
              return (
                <div key={stage.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {stage.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                      {stage.count} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: '4px', backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Attention & Smart Advice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Needs Attention Card */}
          <div style={{
            backgroundColor: unreadCount > 0 ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.03)',
            borderRadius: '18px',
            border: `1px solid ${unreadCount > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
            padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: unreadCount > 0 ? '#F59E0B' : '#10B981' }}>
                  {unreadCount > 0 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                </span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>
                  Needs Your Attention
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                {unreadCount > 0
                  ? `You have ${unreadCount} new lead${unreadCount > 1 ? 's' : ''} captured by your AI chatbot that need initial review or callback.`
                  : 'All caught up! No overdue leads or urgent pending callbacks right now.'
                }
              </p>
            </div>

            {unreadCount > 0 && (
              <Link href="/dashboard/leads" style={{
                marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '9px', backgroundColor: '#F59E0B',
                color: '#000', fontSize: '12px', fontWeight: '800', textDecoration: 'none', width: 'fit-content'
              }}>
                Review {unreadCount} New Lead{unreadCount > 1 ? 's' : ''} <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* AI Best Send Window Advice */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.08)', padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI Best Send Window
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'white', margin: '0 0 6px 0' }}>
              Mid-morning (Tue – Thu, 10:00 AM – 11:30 AM)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Real estate buyers and sellers have 42% higher response rates to follow-up texts and calls during mid-morning hours before afternoon meetings.
            </p>
          </div>

        </div>

      </div>

      {/* ── Recent AI Chatbot Inquiries ── */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.08)', padding: '28px', marginBottom: '36px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>
              Recent AI Chatbot Inquiries
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Latest leads captured automatically by your real estate assistant
            </p>
          </div>
          <Link href="/dashboard/leads" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none'
          }}>
            View All in CRM <ArrowRight size={14} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '14px',
            border: '1px dashed rgba(255,255,255,0.1)'
          }}>
            <MessageSquare size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No chatbot inquiries yet</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0' }}>
              When clients talk to your AI assistant on your website, their contact details and property preferences will automatically appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentLeads.map((lead) => {
              const { preview, isHot, type } = parseLeadPreview(lead.property_interest);
              const timeAgo = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div key={lead.id} className="dashboard-inquiry-card" style={{
                  padding: '14px 18px', borderRadius: '14px',
                  backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '14px', transition: 'all 0.15s'
                }}>
                  <div className="inquiry-lead-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: isHot ? 'linear-gradient(135deg, #EF4444, #B91C1C)' : 'linear-gradient(135deg, #4F46E5, #3730A3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: '800', fontSize: '15px', flexShrink: 0
                    }}>
                      {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lead.name || 'Anonymous Visitor'}
                        </span>
                        {isHot && (
                          <span style={{ fontSize: '9px', fontWeight: '800', padding: '1px 6px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                            🔥 Hot
                          </span>
                        )}
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                          {type}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={10} /> {lead.phone}</span>}
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inquiry-lead-text" style={{ flex: 1, minWidth: '0' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                      {preview}
                    </p>
                  </div>

                  <div className="inquiry-lead-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                      backgroundColor: lead.status === 'New Lead' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                      color: lead.status === 'New Lead' ? '#10B981' : 'var(--text-secondary)',
                      border: lead.status === 'New Lead' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent'
                    }}>
                      {lead.status || 'New Lead'}
                    </span>
                    <Link href="/dashboard/leads" style={{
                      padding: '6px 12px', borderRadius: '8px',
                      backgroundColor: 'rgba(201,162,39,0.12)', color: 'var(--primary)',
                      textDecoration: 'none', fontSize: '11px', fontWeight: '700',
                      border: '1px solid rgba(201,162,39,0.25)', whiteSpace: 'nowrap'
                    }}>
                      Open in CRM
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </motion.div>
  );
}
