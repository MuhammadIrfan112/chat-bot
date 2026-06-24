'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STATUS_COLORS = {
  'New Lead': { bg: '#D1FAE5', text: '#065F46' },
  'Contacted': { bg: '#FEF3C7', text: '#92400E' },
  'Qualified': { bg: '#DBEAFE', text: '#1E40AF' },
  'Closed': { bg: '#F3F4F6', text: '#374151' },
};

// Detect bot industry from its name/source
const getInterestLabel = (botName = '', chatbotSource = '') => {
  const combined = (botName + ' ' + chatbotSource).toLowerCase();
  if (combined.includes('real estate') || combined.includes('realty') || combined.includes('property') || combined.includes('luxe')) {
    return 'Property Interest';
  }
  if (combined.includes('ecommerce') || combined.includes('e-commerce') || combined.includes('shop') || combined.includes('store') || combined.includes('product') || combined.includes('fashion')) {
    return 'Product Interest';
  }
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

    // Get user's bots with name info
    const { data: bots } = await supabase.from('bots').select('id, name').eq('user_id', userId);
    if (!bots || bots.length === 0) {
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
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>🎯 Leads CRM</h1>
          <p style={{ color: '#6B7280' }}>All contacts captured by your chatbot, in real-time.</p>
        </div>
        <button onClick={fetchLeads} style={{ backgroundColor: '#4F46E5', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {['New Lead', 'Contacted', 'Qualified', 'Closed'].map(status => (
          <div key={status} style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              {leads.filter(l => l.status === status).length}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '4px' }}>{status}</div>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading leads...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>No leads yet</h3>
            <p>When visitors share their info in the chatbot, they will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Name', 'Phone', 'Email', 'Inquiry / Interest', 'Bot', 'Status', 'Received', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                  const bot = botsMap[lead.bot_id];
                  const interestLabel = getInterestLabel(bot?.name, lead.chatbot_source);
                  const isRealEstate = interestLabel === 'Property Interest';
                  const isEcommerce = interestLabel === 'Product Interest';

                  return (
                    <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      {/* Name */}
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>{lead.name || '—'}</td>
                      
                      {/* Phone */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        {lead.phone_number ? (
                          <a href={`tel:${lead.phone_number}`} style={{ color: '#059669', fontWeight: '600', textDecoration: 'none' }}>
                            📞 {lead.phone_number}
                          </a>
                        ) : '—'}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        <a href={`mailto:${lead.email}`} style={{ color: '#4F46E5', fontWeight: '500', textDecoration: 'none' }}>{lead.email}</a>
                      </td>

                      {/* Inquiry/Interest — label and icon changes based on bot type */}
                      <td style={{ padding: '16px 20px', color: '#374151', fontSize: '13px', maxWidth: '220px' }}>
                        <div style={{ marginBottom: '2px', fontSize: '11px', fontWeight: '700', color: isRealEstate ? '#7C3AED' : isEcommerce ? '#0369A1' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isRealEstate ? '🏠 ' : isEcommerce ? '🛍️ ' : '💬 '}{interestLabel}
                        </div>
                        <span title={lead.property_interest || ''} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {lead.property_interest || '—'}
                        </span>
                      </td>

                      {/* Bot Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {bot?.name || lead.chatbot_source || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value)}
                          style={{ backgroundColor: sc.bg, color: sc.text, padding: '4px 8px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                        >
                          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: '14px', whiteSpace: 'nowrap' }}>{timeAgo(lead.created_at)}</td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px' }}>
                        <button onClick={() => deleteLead(lead.id)} style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
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
