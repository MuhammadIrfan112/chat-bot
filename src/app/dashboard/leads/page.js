'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STATUS_COLORS = {
  'New Lead': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  'Contacted': { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  'Qualified': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' },
  'Closed': { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
};

// Return the correct label based on bot industry
const getInterestLabel = (industry = 'Other') => {
  if (industry === 'Real Estate') return 'Property Interest';
  if (industry === 'E-Commerce') return 'Product Interest';
  return 'Customer Inquiry';
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [botsMap, setBotsMap] = useState({}); // bot_id -> bot
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Get user's bots with name and industry info (with fallback for missing industry column)
    let bots = [];
    const { data: botsWithInd, error: indError } = await supabase.from('bots').select('id, name, industry').eq('user_id', userId);
    
    if (indError) {
      const { data: fallbackBots } = await supabase.from('bots').select('id, name').eq('user_id', userId);
      bots = fallbackBots || [];
    } else {
      bots = botsWithInd || [];
    }
    
    if (bots.length === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }

    // Build a map of bot_id -> bot for quick lookup
    const map = {};
    bots.forEach(b => { map[b.id] = b; });
    setBotsMap(map);

    const botIds = bots.map(b => b.id);

    // Fetch leads for those bots
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .in('bot_id', botIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('leads').update({ status }).eq('id', id);
    fetchLeads();
  };

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>🎯 Leads CRM</h1>
          <p style={{ color: 'var(--text-secondary)' }}>All contacts captured by your chatbot, in real-time.</p>
        </div>
        <button onClick={fetchLeads} style={{ background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)', transition: 'all 0.2s' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {['New Lead', 'Contacted', 'Qualified', 'Closed'].map(status => (
          <div key={status} className="glass-panel" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {leads.filter(l => l.status === status).length}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</div>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading leads...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No leads yet</h3>
            <p>When visitors share their info in the chatbot, they will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Phone', 'Email', 'Inquiry / Interest', 'Bot', 'Status', 'Received', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                  const bot = botsMap[lead.bot_id];
                  const interestLabel = getInterestLabel(bot?.industry || 'Other');
                  const isRealEstate = interestLabel === 'Property Interest';
                  const isEcommerce = interestLabel === 'Product Interest';

                  return (
                    <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {/* Name */}
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{lead.name || '—'}</td>
                      
                      {/* Phone */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        {lead.phone_number ? (
                          <a href={`tel:${lead.phone_number}`} style={{ color: '#34D399', fontWeight: '600', textDecoration: 'none' }}>
                            📞 {lead.phone_number}
                          </a>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <a href={`mailto:${lead.email}`} style={{ color: '#818CF8', fontWeight: '500', textDecoration: 'none' }}>{lead.email}</a>
                      </td>

                      {/* Inquiry/Interest */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '220px' }}>
                        <div style={{ marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: isRealEstate ? '#A78BFA' : isEcommerce ? '#38BDF8' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isRealEstate ? '🏠 ' : isEcommerce ? '🛍️ ' : '💬 '}{interestLabel}
                        </div>
                        <span title={lead.property_interest || ''} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {lead.property_interest || '—'}
                        </span>
                      </td>

                      {/* Bot Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ backgroundColor: 'rgba(129, 140, 248, 0.15)', color: '#818CF8', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {bot?.name || lead.chatbot_source || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value)}
                          style={{ backgroundColor: sc.bg, color: sc.text, padding: '6px 10px', borderRadius: '8px', border: '1px solid ' + sc.text + '40', fontWeight: '600', fontSize: '13px', cursor: 'pointer', outline: 'none', appearance: 'none' }}
                        >
                          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>{timeAgo(lead.created_at)}</td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px' }}>
                        <button onClick={() => deleteLead(lead.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.backgroundColor='rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.target.style.backgroundColor='rgba(239, 68, 68, 0.1)'}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
