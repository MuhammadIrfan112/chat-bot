'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STATUS_COLORS = {
  'New Lead': { bg: '#D1FAE5', text: '#065F46' },
  'Contacted': { bg: '#FEF3C7', text: '#92400E' },
  'Qualified': { bg: '#DBEAFE', text: '#1E40AF' },
  'Closed': { bg: '#F3F4F6', text: '#374151' },
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Get user's bots
    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
    if (!bots || bots.length === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Name', 'Phone', 'Email', 'Property Interest', 'Status', 'Received', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                return (
                   <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: '#111827' }}>{lead.name || '—'}</td>
                    <td style={{ padding: '16px 20px', color: '#059669', fontWeight: '500' }}>{lead.phone_number || '—'}</td>
                    <td style={{ padding: '16px 20px', color: '#4F46E5', fontWeight: '500' }}>{lead.email}</td>
                    <td style={{ padding: '16px 20px', color: '#374151', fontSize: '13px', maxWidth: '200px' }}>
                      <span title={lead.property_interest || ''} style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {lead.property_interest || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        style={{ backgroundColor: sc.bg, color: sc.text, padding: '4px 8px', borderRadius: '6px', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: '14px' }}>{timeAgo(lead.created_at)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <button onClick={() => deleteLead(lead.id)} style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
