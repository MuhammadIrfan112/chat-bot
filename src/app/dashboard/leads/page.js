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

// Extract inquiry text, links, and lead temperature from property_interest field
const parseInterest = (raw = '') => {
  if (!raw) return { leadType: 'Other', inquiry: '', links: [], temperature: null };
  
  let temperature = null;
  let leadType = 'Buying Home'; // Default fallback
  let textToParse = raw;
  
  // Extract Lead Temperature if present
  const tempMatch = raw.match(/\[Lead Temperature:\s*(.*?)\]/);
  if (tempMatch) {
    temperature = tempMatch[1];
    textToParse = textToParse.replace(tempMatch[0], '').trim();
  }

  // Extract Lead Type if present
  const typeMatch = textToParse.match(/\[Lead Type:\s*(.*?)\]/);
  if (typeMatch) {
    leadType = typeMatch[1];
    textToParse = textToParse.replace(typeMatch[0], '').trim();
  } else {
    // Fallback for older leads without the [Lead Type: ] tag
    const lower = textToParse.toLowerCase();
    if (lower.includes('occupants:') || lower.includes('pets:') || lower.includes('moving timeline:')) {
      leadType = 'Renting Home';
    } else if (lower.includes('estimated market value') || lower.includes('sell quickly') || lower.includes('reason for selling')) {
      leadType = 'Selling Home';
    }
  }

  const parts = textToParse.split('Viewed Links:');
  const inquiry = parts[0].replace('Preferred Callback Time:', '\n⏰ Preferred Time:').trim();
  const linksRaw = parts[1] ? parts[1].trim() : '';
  const links = linksRaw.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
  
  return { leadType, inquiry, links, temperature };
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [botsMap, setBotsMap] = useState({}); // bot_id -> bot
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true' || localStorage.getItem('isDemo') === 'true';
    if (isDemo) {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .is('bot_id', null)
        .eq('chatbot_source', 'demo-real-estate')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setLeads(data);
      }
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

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

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['All', 'Buying Home', 'Renting Home', 'Selling Home'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeTab === tab ? 'var(--text-primary)' : 'var(--border)',
              backgroundColor: activeTab === tab ? 'var(--text-primary)' : 'transparent',
              color: activeTab === tab ? 'var(--bg-card)' : 'var(--text-secondary)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab}
          </button>
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
                  {['Name', 'Phone', 'Email', 'Inquiry / Interest', 'Property Links', 'Bot', 'Status', 'Received', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.filter(lead => {
                  if (activeTab === 'All') return true;
                  const { leadType } = parseInterest(lead.property_interest);
                  return leadType === activeTab;
                }).map((lead, i, arr) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                  const bot = botsMap[lead.bot_id];
                  const interestLabel = getInterestLabel(bot?.industry || 'Other');
                  const isRealEstate = interestLabel === 'Property Interest';
                  const isEcommerce = interestLabel === 'Product Interest';
                  const { leadType, inquiry, links, temperature } = parseInterest(lead.property_interest);

                  return (
                    <tr key={lead.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
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

                      {/* Inquiry/Interest — text only, no links */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: leadType.includes('Selling') ? '#F59E0B' : leadType.includes('Rent') ? '#EC4899' : '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {leadType}
                          </span>
                          {temperature && (
                            <span style={{ 
                              fontSize: '10px', 
                              fontWeight: '700', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              backgroundColor: temperature.includes('Hot') ? 'rgba(239, 68, 68, 0.15)' : temperature.includes('Warm') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                              color: temperature.includes('Hot') ? '#EF4444' : temperature.includes('Warm') ? '#F59E0B' : '#9CA3AF',
                              border: `1px solid ${temperature.includes('Hot') ? 'rgba(239, 68, 68, 0.3)' : temperature.includes('Warm') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`
                            }}>
                              {temperature}
                            </span>
                          )}
                        </div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                          {inquiry || '—'}
                        </div>
                      </td>

                      {/* Property Links — dedicated column */}
                      <td style={{ padding: '16px 20px', minWidth: '160px' }}>
                        {links.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: '#3B82F6',
                                  textDecoration: 'none',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: 'rgba(59,130,246,0.12)',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(59,130,246,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='rgba(59,130,246,0.12)'}
                              >
                                🔗 Property {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
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
