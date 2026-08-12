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

  // Parse structured data from bullet points
  const details = {};
  inquiry.split('\n').forEach(line => {
    const cleanLine = line.replace(/^[•\-\s📋]+/, '').trim();
    if (cleanLine.includes(':')) {
      const [key, ...valueParts] = cleanLine.split(':');
      const val = valueParts.join(':').trim();
      if (val && val !== 'Not specified' && val !== 'Unknown') {
        details[key.trim().replace(/^⏰ |^📍 |^🛏️ |^🛁 |^🚗 |^✨ |^💰 |^📅 |^👥 |^🐾 |^🏦 |^🛠️ /, '')] = val;
      }
    }
  });
  
  return { leadType, inquiry, links, temperature, details };
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [botsMap, setBotsMap] = useState({}); // bot_id -> bot
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedLeadId, setSelectedLeadId] = useState(null);

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

  useEffect(() => {
    fetchLeads();
  }, []);

  

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

      {/* Leads Content */}
      <div className={activeTab === 'All' ? "glass-panel" : ""} style={{ borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>No leads yet</h3>
            <p>When visitors share their info in the chatbot, they will appear here.</p>
          </div>
        ) : activeTab === 'All' ? (
          /* COMPACT ALL LEADS TABLE */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Name / Contact</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Lead Temp</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Nature</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i, arr) => {
                  const { leadType } = parseInterest(lead.property_interest);
                  const computedTemp = leadType.includes('Buying') ? 'Hot' : 'Warm';
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
                  return (
                    <tr key={lead.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(lead.created_at).toLocaleDateString('en-GB')} -
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{lead.name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.phone_number || lead.email}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: computedTemp === 'Hot' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: computedTemp === 'Hot' ? '#EF4444' : '#F59E0B' }}>
                          🔥 {computedTemp}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: leadType.includes('Selling') ? '#F59E0B' : leadType.includes('Rent') ? '#EC4899' : '#A78BFA' }}>
                        {leadType}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: sc.bg,
                            color: sc.text,
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {Object.keys(STATUS_COLORS).map(s => (
                            <option key={s} value={s} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setActiveTab(leadType);
                            setTimeout(() => {
                              const el = document.getElementById(`lead-card-${lead.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #818CF8, #4F46E5)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          👁 View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* DETAILED VERTICAL CARDS (Mobile Friendly) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {leads.filter(lead => {
              const { leadType } = parseInterest(lead.property_interest);
              return leadType === activeTab;
            }).map((lead) => {
              const { leadType, details, inquiry } = parseInterest(lead.property_interest);
              const computedTemp = leadType.includes('Buying') ? 'Hot' : 'Warm';
              const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];

              return (
                <div
                  id={`lead-card-${lead.id}`}
                  key={lead.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    border: selectedLeadId === lead.id ? '2px solid #818CF8' : '1px solid var(--border)',
                    boxShadow: selectedLeadId === lead.id ? '0 0 0 4px rgba(129,140,248,0.15)' : undefined,
                    transition: 'border 0.3s, box-shadow 0.3s'
                  }}
                >
                  
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Dated: {new Date(lead.created_at).toLocaleDateString('en-GB')}</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{lead.name || 'Unknown Name'}</div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: computedTemp === 'Hot' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: computedTemp === 'Hot' ? '#EF4444' : '#F59E0B' }}>
                      🔥 {computedTemp}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</div>
                      <div style={{ fontWeight: '600', color: '#34D399' }}>{lead.phone_number ? <a href={`tel:${lead.phone_number}`} style={{ color: 'inherit', textDecoration: 'none' }}>{lead.phone_number}</a> : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</div>
                      <div style={{ fontWeight: '500', color: '#818CF8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.email ? <a href={`mailto:${lead.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{lead.email}</a> : '—'}</div>
                    </div>
                  </div>

                  {/* Parsed Details List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(details).length > 0 ? (
                      Object.entries(details).map(([key, val]) => {
                        // Skip some redundant fields we might not want to highlight as strongly
                        if (key.toLowerCase().includes('buyer requirements') || key.toLowerCase().includes('lead type')) return null;
                        
                        return (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>{key}</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>{val}</span>
                          </div>
                        );
                      })
                    ) : (
                      // Fallback if no structured details were parsed
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{inquiry}</div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: sc.bg,
                        color: sc.text,
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {Object.keys(STATUS_COLORS).map(s => (
                        <option key={s} value={s} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{s}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => { if(window.confirm('Delete this lead?')) deleteLead(lead.id) }}
                      style={{ padding: '6px', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: '0.7', transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                      title="Delete Lead"
                    >
                      🗑️
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
