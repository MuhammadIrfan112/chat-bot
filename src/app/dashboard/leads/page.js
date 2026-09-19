'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const PIPELINE_STAGES = [
  { key: 'New Lead',  label: 'New Lead',   color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  { key: 'Seen',      label: 'Seen',       color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' },
  { key: 'Contacted', label: 'Contacted',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  { key: 'Qualified', label: 'Qualified',  color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' },
  { key: 'Viewing',   label: 'Viewing',    color: '#EC4899', bg: 'rgba(236,72,153,0.15)' },
  { key: 'Offer',     label: 'Offer',      color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  { key: 'Closed',    label: 'Closed',     color: '#C9A227', bg: 'rgba(201,162,39,0.15)' },
];
const stageMap = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s]));

const getTempFromRaw = (raw = '', status = '') => {
  const upper = raw.toUpperCase();
  if (upper.includes('TEMPERATURE: HOT')) return 'Hot';
  if (upper.includes('TEMPERATURE: COLD')) return 'Cold';
  if (upper.includes('TEMPERATURE: WARM')) return 'Warm';
  if (status === 'Qualified' || status === 'Offer' || status === 'Closed') return 'Hot';
  if (upper.includes('PRE-APPROVED') || upper.includes('URGENT')) return 'Hot';
  return 'Warm';
};

const TempBadge = ({ temp }) => {
  const cfg = {
    Hot:  { icon: '🔥', color: '#F87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)'  },
    Warm: { icon: '🌡️', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
    Cold: { icon: '❄️', color: '#60A5FA', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
  }[temp] || { icon: '🌡️', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '8px',
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {cfg.icon} {temp}
    </span>
  );
};

const parseLeadData = (raw = '') => {
  if (!raw) return { leadType: 'Buying Home', inquiry: '', links: [], temperature: 'Warm', details: {} };
  let text = raw;
  let leadType = 'Buying Home';
  const tempMatch = text.match(/\[Lead Temperature:\s*(.*?)\]/i);
  if (tempMatch) { text = text.replace(tempMatch[0], '').trim(); }
  const typeMatch = text.match(/\[Lead Type:\s*(.*?)\]/i);
  if (typeMatch) { leadType = typeMatch[1]; text = text.replace(typeMatch[0], '').trim(); }
  else {
    const lower = text.toLowerCase();
    if (lower.includes('occupants:') || lower.includes('pets:') || lower.includes('moving timeline:')) leadType = 'Renting Home';
    else if (lower.includes('estimated market value') || lower.includes('reason for selling')) leadType = 'Selling Home';
  }
  const parts = text.split('Viewed Links:');
  const inquiry = parts[0].replace('Preferred Callback Time:', '\n⏰ Preferred Time:').trim();
  const linksRaw = parts[1] ? parts[1].trim() : '';
  const links = linksRaw.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
  const details = {};
  inquiry.split('\n').forEach(line => {
    const cleanLine = line.replace(/^[•\-\s📋]+/, '').trim();
    if (cleanLine.includes(':')) {
      const [key, ...vp] = cleanLine.split(':');
      const val = vp.join(':').trim();
      if (val && val !== 'Not specified' && val !== 'Unknown') {
        details[key.trim().replace(/^(⏰|📍|🛏️|🛁|🚗|✨|💰|📅|👥|🐾|🏦|🛠️|❤️)\s/, '')] = val;
      }
    }
  });
  return { leadType, inquiry, links, details };
};

const filterByDate = (leads, range) => {
  if (range === 'All Time') return leads;
  const now = new Date();
  const cutoffs = {
    'Today': new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    'This Week': new Date(now - 7 * 86400000),
    'This Month': new Date(now.getFullYear(), now.getMonth(), 1),
  };
  const cutoff = cutoffs[range];
  return cutoff ? leads.filter(l => new Date(l.created_at) >= cutoff) : leads;
};

const Avatar = ({ name, temp }) => {
  const colors = { Hot: 'linear-gradient(135deg,#EF4444,#B91C1C)', Warm: 'linear-gradient(135deg,#F59E0B,#B45309)', Cold: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' };
  return (
    <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, background: colors[temp] || colors.Warm, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '16px' }}>
      {name ? name.charAt(0).toUpperCase() : 'L'}
    </div>
  );
};

export default function LeadsCRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('All Time');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const isDemo = localStorage.getItem('isDemo') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
      if (isDemo) {
        const { data } = await supabase.from('leads').select('*').is('bot_id', null).eq('chatbot_source', 'demo-real-estate').order('created_at', { ascending: false });
        setLeads(data || []); setLoading(false); setRefreshing(false); return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
      const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
      if (!bots?.length) { setLeads([]); setLoading(false); setRefreshing(false); return; }
      const { data } = await supabase.from('leads').select('*').in('bot_id', bots.map(b => b.id)).order('created_at', { ascending: false });
      setLeads(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, status }));
    await supabase.from('leads').update({ status }).eq('id', id);
  };

  const openModal = (lead) => {
    const updated = lead.status === 'New Lead' ? { ...lead, status: 'Seen' } : lead;
    if (lead.status === 'New Lead') updateStatus(lead.id, 'Seen');
    setSelectedLead(updated); setNotes(updated.notes || ''); setNotesSaved(false);
  };

  const saveNotes = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    await supabase.from('leads').update({ notes }).eq('id', selectedLead.id);
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes } : l));
    setSelectedLead(prev => ({ ...prev, notes }));
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead permanently?')) return;
    await supabase.from('leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLead?.id === id) setSelectedLead(null);
  };

  const filtered = (() => {
    let r = leads;
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(l => (l.name || '').toLowerCase().includes(q) || (l.phone_number || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q)); }
    r = filterByDate(r, dateRange);
    if (typeFilter !== 'All') r = r.filter(l => parseLeadData(l.property_interest).leadType === typeFilter);
    if (statusFilter !== 'All') r = r.filter(l => l.status === statusFilter);
    return r;
  })();

  const stats = PIPELINE_STAGES.map(s => ({ ...s, count: leads.filter(l => l.status === s.key).length }));
  const cellStyle = { padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary)', verticalAlign: 'middle' };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(201,162,39,0.15)', borderTopColor: '#C9A227', animation: 'spin 0.9s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading CRM...</span>
      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.02em' }}>🎯 CRM Pipeline</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{leads.length} total leads captured by your AI chatbot</p>
        </div>
        <button onClick={() => fetchLeads(true)} disabled={refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', backgroundColor: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.3)', color: '#C9A227', fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: refreshing ? 0.6 : 1 }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.18)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.1)'}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }}>↻</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Pipeline Stats - clickable to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {stats.map(s => (
          <div key={s.key} onClick={() => setStatusFilter(statusFilter === s.key ? 'All' : s.key)}
            style={{ padding: '16px 12px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', backgroundColor: statusFilter === s.key ? s.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${statusFilter === s.key ? s.color : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.2s' }}
            onMouseEnter={e => { if (statusFilter !== s.key) e.currentTarget.style.borderColor = s.color + '55'; }}
            onMouseLeave={e => { if (statusFilter !== s.key) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '16px 18px', borderRadius: '14px', marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>}
        </div>
        {['All Time', 'Today', 'This Week', 'This Month'].map(d => (
          <button key={d} onClick={() => setDateRange(d)} style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', backgroundColor: dateRange === d ? 'rgba(201,162,39,0.15)' : 'transparent', border: `1px solid ${dateRange === d ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.08)'}`, color: dateRange === d ? '#C9A227' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{d}</button>
        ))}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' }}>
          <option value="All">All Types</option>
          <option value="Buying Home">Buying</option>
          <option value="Selling Home">Selling</option>
          <option value="Renting Home">Renting</option>
        </select>
        {(search || dateRange !== 'All Time' || typeFilter !== 'All' || statusFilter !== 'All') && (
          <button onClick={() => { setSearch(''); setDateRange('All Time'); setTypeFilter('All'); setStatusFilter('All'); }}
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Leads Table */}
      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '14px' }}>📭</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>No leads found</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{leads.length === 0 ? 'Your AI chatbot will send leads here automatically.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['', 'Lead', 'Contact', 'Type', 'Temp', 'Stage', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const { leadType } = parseLeadData(lead.property_interest);
                  const temp = getTempFromRaw(lead.property_interest, lead.status);
                  const stage = stageMap[lead.status] || stageMap['New Lead'];
                  const isNew = lead.status === 'New Lead';
                  return (
                    <tr key={lead.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'background 0.15s', backgroundColor: isNew ? 'rgba(16,185,129,0.03)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = isNew ? 'rgba(16,185,129,0.03)' : 'transparent'}>
                      <td style={{ ...cellStyle, width: '52px' }}><Avatar name={lead.name} temp={temp} /></td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{lead.name || 'Anonymous'}</span>
                          {isNew && <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)', textTransform: 'uppercase' }}>New</span>}
                          {lead.notes && <span title="Has notes" style={{ fontSize: '12px' }}>📌</span>}
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {lead.phone_number && <a href={`tel:${lead.phone_number}`} style={{ color: '#34D399', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>📞 {lead.phone_number}</a>}
                          {lead.email && <a href={`mailto:${lead.email}`} style={{ color: '#818CF8', textDecoration: 'none', fontSize: '12px' }}>✉️ <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{lead.email}</span></a>}
                          {!lead.phone_number && !lead.email && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', backgroundColor: leadType.includes('Sell') ? 'rgba(245,158,11,0.1)' : leadType.includes('Rent') ? 'rgba(236,72,153,0.1)' : 'rgba(139,92,246,0.1)', color: leadType.includes('Sell') ? '#F59E0B' : leadType.includes('Rent') ? '#EC4899' : '#A78BFA', whiteSpace: 'nowrap' }}>
                          {leadType.includes('Sell') ? '🏷️' : leadType.includes('Rent') ? '🔑' : '🏠'} {leadType}
                        </span>
                      </td>
                      <td style={cellStyle}><TempBadge temp={temp} /></td>
                      <td style={cellStyle}>
                        <select value={lead.status || 'New Lead'} onChange={e => updateStatus(lead.id, e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: stage.bg, color: stage.color, border: `1px solid ${stage.color}44`, outline: 'none', cursor: 'pointer' }}>
                          {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key} style={{ backgroundColor: '#111', color: '#fff' }}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                        📅 {new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openModal(lead)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: '700', background: 'rgba(201,162,39,0.12)', border: '1px solid rgba(201,162,39,0.3)', color: '#C9A227', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,162,39,0.22)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,162,39,0.12)'}>
                            👁 View
                          </button>
                          <button onClick={() => deleteLead(lead.id)}
                            style={{ padding: '7px 9px', borderRadius: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Showing {filtered.length} of {leads.length} leads</div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLead && (() => {
          const { leadType, details, inquiry, links } = parseLeadData(selectedLead.property_interest);
          const temp = getTempFromRaw(selectedLead.property_interest, selectedLead.status);
          const stage = stageMap[selectedLead.status] || stageMap['New Lead'];
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
              onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null); }}>
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.22 }}
                style={{ width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '22px', backgroundColor: '#0D0D0D', border: '1px solid rgba(201,162,39,0.2)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', color: 'white' }}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(201,162,39,0.06) 0%, transparent 60%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Avatar name={selectedLead.name} temp={temp} />
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{selectedLead.name || 'Anonymous Lead'}</h2>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                        <TempBadge temp={temp} />
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', backgroundColor: stage.bg, color: stage.color, border: `1px solid ${stage.color}44` }}>{selectedLead.status}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 {new Date(selectedLead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>✕</button>
                </div>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>📞 Phone</div>
                      {selectedLead.phone_number ? <a href={`tel:${selectedLead.phone_number}`} style={{ fontSize: '15px', fontWeight: '700', color: '#34D399', textDecoration: 'none' }}>{selectedLead.phone_number}</a> : <span style={{ color: 'var(--text-muted)' }}>Not provided</span>}
                    </div>
                    <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>✉️ Email</div>
                      {selectedLead.email ? <a href={`mailto:${selectedLead.email}`} style={{ fontSize: '14px', fontWeight: '700', color: '#818CF8', textDecoration: 'none', wordBreak: 'break-all' }}>{selectedLead.email}</a> : <span style={{ color: 'var(--text-muted)' }}>Not provided</span>}
                    </div>
                  </div>
                  <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>{leadType.includes('Sell') ? '🏷️' : leadType.includes('Rent') ? '🔑' : '🏠'}</span>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Lead Type</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: leadType.includes('Sell') ? '#F59E0B' : leadType.includes('Rent') ? '#EC4899' : '#A78BFA' }}>{leadType}</div>
                    </div>
                  </div>
                  {Object.entries(details).length > 0 && (
                    <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#C9A227', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>🏡 Property Requirements</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(details).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', minWidth: '110px' }}>{key}</span>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', textAlign: 'right', maxWidth: '60%' }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.entries(details).length === 0 && inquiry && (
                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: '#D1D5DB', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{inquiry}</div>
                  )}
                  {links.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Pages Viewed</div>
                      {links.map((link, idx) => (
                        <a key={idx} href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', color: '#818CF8', textDecoration: 'none', fontSize: '12px', marginBottom: '6px', wordBreak: 'break-all' }}>🔗 {link}</a>
                      ))}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>📌 Agent Notes</div>
                    <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
                      placeholder="Add private notes — follow-up details, callback times, preferences..."
                      rows={4}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'vertical', outline: 'none', lineHeight: '1.5', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(201,162,39,0.4)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button onClick={saveNotes} disabled={savingNotes}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', backgroundColor: notesSaved ? 'rgba(16,185,129,0.15)' : 'rgba(201,162,39,0.12)', color: notesSaved ? '#10B981' : '#C9A227', border: `1px solid ${notesSaved ? 'rgba(16,185,129,0.3)' : 'rgba(201,162,39,0.3)'}` }}>
                        {notesSaved ? '✅ Saved!' : savingNotes ? '⏳ Saving...' : '💾 Save Notes'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>Stage:</span>
                      <select value={selectedLead.status} onChange={e => updateStatus(selectedLead.id, e.target.value)}
                        style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', backgroundColor: stage.bg, color: stage.color, border: `1px solid ${stage.color}44`, outline: 'none', cursor: 'pointer' }}>
                        {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key} style={{ backgroundColor: '#111', color: '#fff' }}>{s.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => deleteLead(selectedLead.id)}
                        style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                        🗑️ Delete
                      </button>
                      <button onClick={() => setSelectedLead(null)}
                        style={{ padding: '8px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #C9A227, #8B6914)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}} input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.22)} select option{background:#111;color:#fff}`}</style>
    </motion.div>
  );
}
