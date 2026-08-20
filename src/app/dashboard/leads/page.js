'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STATUS_COLORS = {
  'New Lead': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  'Seen': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  'Contacted': { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  'Qualified': { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  'Closed': { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
};

// Extract inquiry text, links, and lead temperature from property_interest field
const parseInterest = (raw = '') => {
  if (!raw) return { leadType: 'Buying Home', inquiry: '', links: [], temperature: null, details: {} };
  
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
        const cleanKey = key.trim().replace(/^⏰ |^📍 |^🛏️ |^🛁 |^🚗 |^✨ |^💰 |^📅 |^👥 |^🐾 |^🏦 |^🛠️ |^❤️ /, '');
        details[cleanKey] = val;
      }
    }
  });
  
  return { leadType, inquiry, links, temperature, details };
};

// Helper: Render details value, converting Markdown links & raw URLs into clickable links
const renderDetailValue = (val) => {
  if (!val) return '—';

  // Check for markdown links: [Label](url)
  const mdRegex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
  if (mdRegex.test(val)) {
    const elements = [];
    let lastIndex = 0;
    let match;
    const re = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
    while ((match = re.exec(val)) !== null) {
      if (match.index > lastIndex) {
        elements.push(val.substring(lastIndex, match.index));
      }
      const label = match[1];
      const href = match[2];
      elements.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#818CF8',
            backgroundColor: 'rgba(129, 140, 248, 0.12)',
            padding: '2px 8px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            margin: '2px 0',
            border: '1px solid rgba(129, 140, 248, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.12)'; }}
        >
          📍 {label} ↗
        </a>
      );
      lastIndex = re.lastIndex;
    }
    if (lastIndex < val.length) {
      elements.push(val.substring(lastIndex));
    }
    return <span>{elements}</span>;
  }

  // Check for raw URL: http/https
  if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
    return (
      <a
        href={val}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#818CF8',
          backgroundColor: 'rgba(129, 140, 248, 0.12)',
          padding: '2px 8px',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: '700',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          border: '1px solid rgba(129, 140, 248, 0.25)'
        }}
      >
        🔗 View Listing / Document ↗
      </a>
    );
  }

  return val;
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [botsMap, setBotsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [viewModalLead, setViewModalLead] = useState(null); // focused single lead modal

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

    const map = {};
    bots.forEach(b => { map[b.id] = b; });
    setBotsMap(map);

    const botIds = bots.map(b => b.id);

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
    // Optimistic local update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (viewModalLead && viewModalLead.id === id) {
      setViewModalLead(prev => ({ ...prev, status }));
    }
    await supabase.from('leads').update({ status }).eq('id', id);
  };

  const handleOpenLeadModal = (lead) => {
    let currentLead = lead;
    // If status is "New Lead", automatically mark it as "Seen"
    if (lead.status === 'New Lead') {
      currentLead = { ...lead, status: 'Seen' };
      updateStatus(lead.id, 'Seen');
    }
    setViewModalLead(currentLead);
  };

  const deleteLead = async (id) => {
    await supabase.from('leads').delete().eq('id', id);
    if (viewModalLead && viewModalLead.id === id) {
      setViewModalLead(null);
    }
    fetchLeads();
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {['New Lead', 'Seen', 'Contacted', 'Qualified', 'Closed'].map(status => (
          <div key={status} className="glass-panel" style={{ padding: '18px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: '800', color: (STATUS_COLORS[status] || {}).text || 'var(--text-primary)' }}>
              {leads.filter(l => l.status === status).length}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</div>
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
                          onClick={() => handleOpenLeadModal(lead)}
                          style={{
                            padding: '7px 16px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #818CF8, #4F46E5)',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                          }}
                        >
                          👁 View Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB FILTERED CARDS */
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
                  key={lead.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
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

                  {/* Parsed Details Preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(details).slice(0, 6).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '100px' }}>{key}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>{renderDetailValue(val)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => handleOpenLeadModal(lead)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #818CF8, #4F46E5)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      👁 View Full Card
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        title="Delete Lead"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Focused Single Lead Property Detail Modal ─────────────────── */}
      {viewModalLead && (() => {
        const { leadType, details, inquiry, links } = parseInterest(viewModalLead.property_interest);
        const computedTemp = leadType.includes('Buying') ? 'Hot' : 'Warm';
        const sc = STATUS_COLORS[viewModalLead.status] || STATUS_COLORS['Seen'];

        return (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setViewModalLead(null); }}
          >
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '620px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                color: '#F9FAFB'
              }}
            >
              {/* Modal Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                    Dated: {new Date(viewModalLead.created_at).toLocaleDateString('en-GB')} · {new Date(viewModalLead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    {viewModalLead.name || 'Anonymous Lead'}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: computedTemp === 'Hot' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: computedTemp === 'Hot' ? '#EF4444' : '#F59E0B' }}>
                    🔥 {computedTemp}
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: sc.bg, color: sc.text }}>
                    {viewModalLead.status}
                  </span>
                  <button
                    onClick={() => setViewModalLead(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#9CA3AF',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#FFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#9CA3AF'; }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Contact Information Card */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Phone Number</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#34D399' }}>
                    {viewModalLead.phone_number ? (
                      <a href={`tel:${viewModalLead.phone_number}`} style={{ color: '#34D399', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📞 {viewModalLead.phone_number}
                      </a>
                    ) : 'Not Provided'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Email Address</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#818CF8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {viewModalLead.email ? (
                      <a href={`mailto:${viewModalLead.email}`} style={{ color: '#818CF8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✉️ {viewModalLead.email}
                      </a>
                    ) : 'Not Provided'}
                  </div>
                </div>
              </div>

              {/* Property Requirements & Details Card */}
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🏡 {leadType} Requirements & Interest
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(details).length > 0 ? (
                    Object.entries(details).map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: key.toLowerCase().includes('liked') ? 'rgba(236, 72, 153, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: key.toLowerCase().includes('liked') ? '1px solid rgba(236, 72, 153, 0.25)' : '1px solid rgba(255, 255, 255, 0.03)'
                        }}
                      >
                        <span style={{ fontSize: '13px', color: key.toLowerCase().includes('liked') ? '#F472B6' : '#9CA3AF', fontWeight: '600' }}>
                          {key}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', textAlign: 'right', maxWidth: '65%' }}>
                          {renderDetailValue(val)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '13px', color: '#D1D5DB', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{inquiry}</div>
                  )}
                </div>
              </div>

              {/* Status Update & Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '600' }}>Status:</span>
                  <select
                    value={viewModalLead.status}
                    onChange={(e) => updateStatus(viewModalLead.id, e.target.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      backgroundColor: sc.bg,
                      color: sc.text,
                      border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {Object.keys(STATUS_COLORS).map(s => (
                      <option key={s} value={s} style={{ backgroundColor: '#1F2937', color: '#FFF' }}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { if (window.confirm('Are you sure you want to delete this lead?')) deleteLead(viewModalLead.id); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    🗑️ Delete Lead
                  </button>
                  <button
                    onClick={() => setViewModalLead(null)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #818CF8, #4F46E5)',
                      color: '#FFF',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
