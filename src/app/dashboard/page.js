'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({ leads: 0, knowledge: 0, chats: 0 });
  const [loading, setLoading] = useState(true);
  const [hasBot, setHasBot] = useState(false);
  const [recentLeads, setRecentLeads] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const userId = session.user.id;

    // First check if user has any bots
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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Track your chatbot's performance and recent leads.</p>
        </div>
        
        {hasBot && (
          <Link href="/dashboard/chatbots" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary)', color: 'white', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            New Chatbot
          </Link>
        )}
      </div>

      {!hasBot && !loading && (
        <div className="animate-slide-up" style={{ backgroundColor: 'var(--primary-light)', padding: '32px', borderRadius: '16px', marginBottom: '40px', border: '1px solid #C7D2FE', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Welcome to BotFlow AI</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '15px' }}>You don't have any chatbots yet. Create your first chatbot to start capturing leads instantly.</p>
            <Link href="/dashboard/chatbots" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
              Create Your First Chatbot
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </Link>
          </div>
        </div>
      )}

      <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', animationDelay: '0.1s' }}>
        {/* Stat Card 1 */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--success)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Leads Captured</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{loading ? '...' : stats.leads}</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#ECFDF5', borderRadius: '8px', color: 'var(--success)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Knowledge Items</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{loading ? '...' : stats.knowledge}</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--warning)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Chat Sessions</div>
              <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{loading ? '...' : stats.chats}</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#FFFBEB', borderRadius: '8px', color: 'var(--warning)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="animate-slide-up" style={{ marginTop: '32px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', animationDelay: '0.2s' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FDFBFF' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Recent CRM Leads</h2>
          <Link href="/dashboard/leads" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Link>
        </div>
        
        {recentLeads.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-page)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>No leads captured yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 24px', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '12px 24px', fontWeight: '600' }}>Email / Contact</th>
                  <th style={{ padding: '12px 24px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 24px', fontWeight: '600' }}>Time</th>
                  <th style={{ padding: '12px 24px', fontWeight: '600', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderTop: '1px solid var(--border)', fontSize: '14px', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-page)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: 'var(--text-primary)' }}>{lead.name || '—'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{lead.email}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        backgroundColor: lead.status === 'New Lead' ? '#ECFDF5' : '#FFFBEB', 
                        color: lead.status === 'New Lead' ? '#059669' : '#D97706', 
                        padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '600',
                        border: lead.status === 'New Lead' ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                      }}>
                        {lead.status || 'New Lead'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>{timeAgo(lead.created_at)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button onClick={() => deleteLead(lead.id)} title="Delete Lead" style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
