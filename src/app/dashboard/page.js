'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Users, Database, MessageSquare, ChevronRight, Inbox, Trash2, ShieldAlert, Home, ShoppingBag, TrendingUp, Eye, Tag } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, knowledge: 0, chats: 0 });
  const [loading, setLoading] = useState(true);
  const [hasBot, setHasBot] = useState(false);
  const [recentLeads, setRecentLeads] = useState([]);
  const [websiteType, setWebsiteType] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const type = session.user.user_metadata?.website_type || 'other';
    setWebsiteType(type);

    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);

    if (!bots || bots.length === 0) {
      setHasBot(false);
      setLoading(false);
      return;
    }

    setHasBot(true);
    const botIds = bots.map(b => b.id);

    const [leadsRes, kbRes, chatsRes, recentRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact' }).in('bot_id', botIds),
      supabase.from('knowledge_base').select('id', { count: 'exact' }).in('bot_id', botIds),
      supabase.from('chat_sessions').select('id', { count: 'exact' }).in('bot_id', botIds),
      supabase.from('leads').select('*').in('bot_id', botIds).order('created_at', { ascending: false }).limit(5)
    ]);

    setStats({
      leads: leadsRes.count || 0,
      knowledge: kbRes.count || 0,
      chats: chatsRes.count || 0
    });
    setRecentLeads(recentRes.data || []);
    setLoading(false);
  };

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id);
    fetchStats();
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  // ─── REAL ESTATE specific stat cards ───
  const realEstateStats = [
    { label: 'Buyer Leads Captured', value: stats.leads, icon: <Users size={24} />, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', accent: 'var(--success)' },
    { label: 'Properties in Knowledge Base', value: stats.knowledge, icon: <Home size={24} />, color: 'var(--primary)', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', accent: 'var(--primary)' },
    { label: 'Total Chat Sessions', value: stats.chats, icon: <MessageSquare size={24} />, color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', accent: 'var(--warning)' },
  ];

  // ─── E-COMMERCE specific stat cards ───
  const ecommerceStats = [
    { label: 'Customer Leads Captured', value: stats.leads, icon: <ShoppingBag size={24} />, color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', accent: '#F472B6' },
    { label: 'Products in Knowledge Base', value: stats.knowledge, icon: <Tag size={24} />, color: 'var(--primary)', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', accent: 'var(--primary)' },
    { label: 'Total Chat Sessions', value: stats.chats, icon: <TrendingUp size={24} />, color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', accent: 'var(--warning)' },
  ];

  const activeStats = websiteType === 'ecommerce' ? ecommerceStats : realEstateStats;

  const isRealEstate = websiteType === 'real-estate';
  const isEcommerce = websiteType === 'ecommerce';

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', marginBottom: '10px', background: isEcommerce ? 'rgba(244,114,182,0.12)' : 'rgba(99,102,241,0.12)', border: isEcommerce ? '1px solid rgba(244,114,182,0.3)' : '1px solid rgba(99,102,241,0.3)', color: isEcommerce ? '#F472B6' : 'var(--primary)' }}>
            {isEcommerce ? <ShoppingBag size={13} /> : <Home size={13} />}
            {isEcommerce ? 'E-Commerce Dashboard' : isRealEstate ? 'Real Estate Dashboard' : 'Dashboard'}
          </motion.div>
          <motion.h1 variants={itemVariants} style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Overview</motion.h1>
          <motion.p variants={itemVariants} style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {isEcommerce ? 'Track customer queries, product interest & leads.' : isRealEstate ? 'Track buyer leads, property interest & chat sessions.' : 'Track your chatbot performance and recent leads.'}
          </motion.p>
        </div>

        {hasBot && (
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/chatbots" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #818CF8 0%, #4F46E5 100%)', color: 'white', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}>
              <Plus size={18} />
              New Chatbot
            </Link>
          </motion.div>
        )}
      </div>

      {/* ─── Empty State ─── */}
      {!hasBot && !loading && (
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '40px', borderRadius: '24px', marginBottom: '40px', display: 'flex', gap: '32px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.2, zIndex: 0 }}></div>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(79,70,229,0.2))', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--primary-glow)', position: 'relative', zIndex: 1 }}>
            <ShieldAlert size={40} color="var(--primary)" />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
              {isEcommerce ? 'Welcome to Your E-Commerce Hub! 🛒' : isRealEstate ? 'Welcome to Your Real Estate Hub! 🏠' : 'Welcome to BotFlow AI'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', maxWidth: '600px', lineHeight: '1.6' }}>
              {isEcommerce
                ? "You don't have any chatbots yet. Deploy your AI shopping assistant to capture customer leads and answer product queries 24/7."
                : isRealEstate
                  ? "You don't have any chatbots yet. Deploy your AI property assistant to capture buyer leads and answer property queries 24/7."
                  : "You don't have any chatbots yet. Create your first intelligent assistant in seconds to start capturing leads on autopilot."}
            </p>
            <Link href="/dashboard/chatbots" style={{ background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}>
              Create Your First Chatbot
              <ChevronRight size={18} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {activeStats.map((stat, i) => (
          <motion.div key={i} variants={itemVariants} className="glass-panel" style={{ padding: '24px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: stat.accent }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
                {loading ? (
                  <div style={{ width: '40px', height: '36px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s infinite' }}></div>
                ) : (
                  <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>{stat.value}</div>
                )}
              </div>
              <div style={{ padding: '10px', background: stat.bg, borderRadius: '12px', color: stat.color, border: `1px solid ${stat.border}` }}>
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── E-Commerce Quick Tips ─── */}
      {isEcommerce && (
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(244,114,182,0.2)', background: 'rgba(244,114,182,0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244,114,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Tag size={20} color="#F472B6" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Pro Tip for E-Commerce</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Upload your product catalogue to the Knowledge Base so your chatbot can answer product queries, pricing, and availability instantly.</div>
          </div>
          <Link href="/dashboard/knowledge" style={{ flexShrink: 0, background: 'rgba(244,114,182,0.15)', color: '#F472B6', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(244,114,182,0.3)' }}>
            Add Products <ChevronRight size={15} />
          </Link>
        </motion.div>
      )}

      {/* ─── Real Estate Quick Tips ─── */}
      {isRealEstate && (
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Eye size={20} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Pro Tip for Real Estate</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Upload your property listings, area details, and FAQs to the Knowledge Base so buyers get instant answers on pricing, location, and availability.</div>
          </div>
          <Link href="/dashboard/knowledge" style={{ flexShrink: 0, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(99,102,241,0.3)' }}>
            Add Listings <ChevronRight size={15} />
          </Link>
        </motion.div>
      )}

      {/* ─── Recent Leads Table ─── */}
      <motion.div variants={itemVariants} className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {isEcommerce ? '🛍️ Recent Customer Leads' : isRealEstate ? '🏠 Recent Buyer Leads' : 'Recent CRM Leads'}
          </h2>
          <Link href="/dashboard/leads" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All
            <ChevronRight size={16} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
              <Inbox size={24} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' }}>
              {isEcommerce ? 'No customer leads yet. Your AI shopping assistant will capture them!' : isRealEstate ? 'No buyer leads yet. Your AI property assistant will capture them!' : 'No leads captured yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '700' }}>Name</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700' }}>Email / Contact</th>
                  {isRealEstate && <th style={{ padding: '16px 24px', fontWeight: '700' }}>Interest</th>}
                  {isEcommerce && <th style={{ padding: '16px 24px', fontWeight: '700' }}>Product Interest</th>}
                  <th style={{ padding: '16px 24px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700' }}>Time</th>
                  <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderTop: '1px solid var(--border)', fontSize: '14px', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '20px 24px', fontWeight: '600', color: 'var(--text-primary)' }}>{lead.name || '—'}</td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-secondary)' }}>{lead.email}</td>
                    {(isRealEstate || isEcommerce) && <td style={{ padding: '20px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>{lead.interest || '—'}</td>}
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        background: lead.status === 'New Lead' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: lead.status === 'New Lead' ? 'var(--success)' : 'var(--warning)',
                        padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700',
                        border: lead.status === 'New Lead' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                      }}>
                        {lead.status || 'New Lead'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>{timeAgo(lead.created_at)}</td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button onClick={() => deleteLead(lead.id)} title="Delete Lead" style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
    </motion.div>
  );
}
