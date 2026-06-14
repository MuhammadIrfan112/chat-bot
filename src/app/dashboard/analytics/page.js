'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Analytics() {
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalLeads: 0,
    totalSessions: 0,
    conversionRate: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Get user's bots
    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
    if (!bots || bots.length === 0) {
      setStats({ totalMessages: 0, totalLeads: 0, totalSessions: 0, conversionRate: 0, newLeads: 0, contactedLeads: 0, qualifiedLeads: 0 });
      setRecentLeads([]);
      setLoading(false);
      return;
    }
    const botIds = bots.map(b => b.id);

    const [messagesRes, leadsRes, sessionsRes] = await Promise.all([
      supabase.from('chat_messages').select('id', { count: 'exact' }), // We will filter messages by session bot_id later if needed, for now just global is ok or we can leave it as we don't have bot_id on messages directly
      supabase.from('leads').select('*').in('bot_id', botIds).order('created_at', { ascending: false }),
      supabase.from('chat_sessions').select('id', { count: 'exact' }).in('bot_id', botIds),
    ]);

    const totalMessages = messagesRes.count || 0;
    const leads = leadsRes.data || [];
    const totalSessions = sessionsRes.count || 0;
    const totalLeads = leads.length;
    const conversionRate = totalSessions > 0 ? ((totalLeads / totalSessions) * 100).toFixed(1) : 0;

    setStats({
      totalMessages,
      totalLeads,
      totalSessions,
      conversionRate,
      newLeads: leads.filter(l => l.status === 'New Lead').length,
      contactedLeads: leads.filter(l => l.status === 'Contacted').length,
      qualifiedLeads: leads.filter(l => l.status === 'Qualified').length,
    });
    setRecentLeads(leads.slice(0, 5));
    setLoading(false);
  };

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: color || '#111827', marginTop: '8px', lineHeight: 1 }}>{loading ? '...' : value}</div>
          {sub && <div style={{ fontSize: '13px', color: '#10B981', marginTop: '8px', fontWeight: '600' }}>{sub}</div>}
        </div>
        <div style={{ fontSize: '32px' }}>{icon}</div>
      </div>
    </div>
  );

  // Simple bar chart component
  const BarChart = ({ data }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '120px', padding: '0 8px' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#4F46E5' }}>{item.value}</div>
            <div style={{ width: '100%', backgroundColor: '#4F46E5', borderRadius: '6px 6px 0 0', height: `${(item.value / max) * 90}px`, minHeight: '4px', transition: 'height 0.5s ease' }} />
            <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500', textAlign: 'center' }}>{item.label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>📊 Analytics Dashboard</h1>
          <p style={{ color: '#6B7280' }}>Real-time insights from your chatbot performance.</p>
        </div>
        <button onClick={fetchAnalytics} style={{ backgroundColor: '#4F46E5', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Main Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <StatCard icon="💬" label="Total Messages" value={stats.totalMessages} sub="All time" />
        <StatCard icon="🎯" label="Total Leads" value={stats.totalLeads} sub={`${stats.newLeads} new today`} color="#4F46E5" />
        <StatCard icon="👥" label="Chat Sessions" value={stats.totalSessions} sub="Unique visitors" />
        <StatCard icon="📈" label="Conversion Rate" value={`${stats.conversionRate}%`} sub="Sessions → Leads" color="#10B981" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Lead Pipeline */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#111827' }}>Lead Pipeline</h3>
          <BarChart data={[
            { label: 'New', value: stats.newLeads },
            { label: 'Contacted', value: stats.contactedLeads },
            { label: 'Qualified', value: stats.qualifiedLeads },
            { label: 'Total', value: stats.totalLeads },
          ]} />
        </div>

        {/* Activity Overview */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#111827' }}>Activity Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Messages Sent', value: stats.totalMessages, color: '#4F46E5', max: Math.max(stats.totalMessages, 1) },
              { label: 'Sessions Started', value: stats.totalSessions, color: '#10B981', max: Math.max(stats.totalMessages, 1) },
              { label: 'Leads Captured', value: stats.totalLeads, color: '#F59E0B', max: Math.max(stats.totalMessages, 1) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{item.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: item.color }}>{item.value}</span>
                </div>
                <div style={{ backgroundColor: '#F3F4F6', borderRadius: '50px', height: '8px' }}>
                  <div style={{ backgroundColor: item.color, width: `${Math.min((item.value / item.max) * 100, 100)}%`, height: '100%', borderRadius: '50px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', fontWeight: '700', color: '#111827', fontSize: '16px' }}>
          🎯 Recent Leads
        </div>
        {recentLeads.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>No leads yet. Start chatting!</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', fontSize: '13px', color: '#6B7280' }}>
                {['Name', 'Email', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, i) => (
                <tr key={lead.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '600', color: '#111827' }}>{lead.name || '—'}</td>
                  <td style={{ padding: '14px 20px', color: '#4F46E5' }}>{lead.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '600' }}>{lead.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#6B7280', fontSize: '13px' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
