'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userBots, setUserBots] = useState({}); // { userId: [bots] }
  const [botsLoading, setBotsLoading] = useState({});

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '', industry: 'Real Estate' });
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);

  // Embed Code Modal
  const [codeModal, setCodeModal] = useState(null); // { bot }

  // Assign Plan Modal
  const [assignModal, setAssignModal] = useState(null); // { userId, email }
  const [assignForm, setAssignForm] = useState({ plan: 'starter', cycle: 'monthly', note: '' });
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const getTrialInfo = (user) => {
    if (!user.trial_ends_at) return null;
    const now = new Date();
    const trialEnd = new Date(user.trial_ends_at);
    const diffMs = trialEnd - now;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) return { daysLeft, expired: false };
    return { daysLeft: 0, expired: true };
  };

  const resetTrialTo15Days = async (userId) => {
    const res = await fetch('/api/superadmin/reset-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, days: 15 })
    });
    const data = await res.json();
    if (data.success) {
      alert('Trial reset to 15 days from today ✅');
      fetchUsers();
    } else {
      alert('Error: ' + (data.error || 'Could not reset trial'));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users_subscription')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  const fetchBotsForUser = async (userId) => {
    setBotsLoading(prev => ({ ...prev, [userId]: true }));
    const { data } = await supabase
      .from('bots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setUserBots(prev => ({ ...prev, [userId]: data || [] }));
    setBotsLoading(prev => ({ ...prev, [userId]: false }));
  };

  const toggleUserExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userBots[userId]) fetchBotsForUser(userId);
    }
  };

  const toggleBotStatus = async (bot) => {
    const newStatus = bot.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic update
    setUserBots(prev => ({
      ...prev,
      [bot.user_id]: prev[bot.user_id].map(b => b.id === bot.id ? { ...b, status: newStatus } : b)
    }));
    await supabase.from('bots').update({ status: newStatus }).eq('id', bot.id);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setUsers(users.map(u => u.user_id === userId ? { ...u, status: newStatus } : u));
    await supabase.from('users_subscription').update({ status: newStatus }).eq('user_id', userId);
  };

  const deleteUser = async (userId, email) => {
    const confirmed = window.confirm(`⚠️ Are you sure you want to DELETE "${email || userId}"?\n\nThis will permanently delete:\n• All their chatbots\n• Their subscription\n• Their account\n\nThis action CANNOT be undone!`);
    if (!confirmed) return;

    setDeletingUser(userId);
    try {
      const res = await fetch('/api/superadmin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        // Remove from UI immediately
        setUsers(prev => prev.filter(u => u.user_id !== userId));
        setUserBots(prev => { const n = { ...prev }; delete n[userId]; return n; });
        if (expandedUser === userId) setExpandedUser(null);
      } else {
        alert('Error: ' + (data.error || 'Could not delete user'));
      }
    } catch (e) {
      alert('Network error. Please try again.');
    }
    setDeletingUser(null);
  };

  const handlePayWithStripe = async (e) => {
    e.preventDefault();
    if (!assignModal) return;
    setIsAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: assignForm.plan === 'premium' ? 'pro' : 'starter',
          cycle: assignForm.cycle,
          userId: assignModal.userId,
          userEmail: assignModal.email || 'no-email@realtypropflow.com'
        })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setAssignResult({ type: 'error', message: data.error || 'Failed to start Stripe checkout' });
      }
    } catch (err) {
      setAssignResult({ type: 'error', message: 'Network error.' });
    }
    setIsAssigning(false);
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!assignModal) return;
    setIsAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch('/api/superadmin/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: assignModal.userId, ...assignForm })
      });
      const data = await res.json();
      if (data.success) {
        setAssignResult({ type: 'success', plan: data.plan, endDate: data.endDate });
        // Update user status in local state
        setUsers(prev => prev.map(u => u.user_id === assignModal.userId ? { ...u, status: 'Active' } : u));
        fetchUsers();
      } else {
        setAssignResult({ type: 'error', message: data.error || 'Failed to assign plan' });
      }
    } catch (err) {
      setAssignResult({ type: 'error', message: 'Network error.' });
    }
    setIsAssigning(false);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setAddResult(null);
    try {
      const res = await fetch('/api/superadmin/add-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      console.log('Add Client Response:', data); // always log full response
      if (data.success) {
        setAddResult({ type: 'success', bot: data.bot });
        fetchUsers(); // Refresh list
        setAddForm({ name: '', email: '', password: '', phone: '', industry: 'Real Estate' });
      } else {
        const debugInfo = data.debug ? `\n\nDebug: ${data.debug.join(' → ')}` : '';
        setAddResult({ type: 'error', message: (data.error || 'Failed to add client') + debugInfo });
      }
    } catch (err) {
      setAddResult({ type: 'error', message: 'Network error. Please try again.' });
    }
    setIsAdding(false);
  };

  return (
    <div>
      {/* ── Assign Plan Modal ──────────────────────────────────── */}
      {assignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>💳 Assign Plan — {assignModal.email}</h2>
              <button onClick={() => { setAssignModal(null); setAssignResult(null); }} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>

            {assignResult?.type === 'success' ? (
              <div style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '20px', borderRadius: '10px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Plan Activated!</div>
                <div style={{ fontSize: '14px' }}>{assignResult.plan.charAt(0).toUpperCase() + assignResult.plan.slice(1)} plan active until {new Date(assignResult.endDate).toLocaleDateString()}</div>
                <button onClick={() => { setAssignModal(null); setAssignResult(null); }} style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assignResult?.type === 'error' && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>{assignResult.message}</div>
                )}
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#374151' }}>Select Plan</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setAssignForm(p => ({...p, plan: 'starter'}))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: assignForm.plan === 'starter' ? '2px solid #4F46E5' : '1px solid #D1D5DB', backgroundColor: assignForm.plan === 'starter' ? '#EEF2FF' : 'white', color: '#374151', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>📦 Standard</button>
                    <button type="button" onClick={() => setAssignForm(p => ({...p, plan: 'pro'}))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: assignForm.plan === 'pro' ? '2px solid #F59E0B' : '1px solid #D1D5DB', backgroundColor: assignForm.plan === 'pro' ? '#FFFBEB' : 'white', color: '#374151', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>👑 Premium</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#374151' }}>Billing Cycle</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setAssignForm(p => ({...p, cycle: 'monthly'}))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: assignForm.cycle === 'monthly' ? '2px solid #4F46E5' : '1px solid #D1D5DB', backgroundColor: assignForm.cycle === 'monthly' ? '#EEF2FF' : 'white', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Monthly</button>
                    <button type="button" onClick={() => setAssignForm(p => ({...p, cycle: 'yearly'}))} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: assignForm.cycle === 'yearly' ? '2px solid #4F46E5' : '1px solid #D1D5DB', backgroundColor: assignForm.cycle === 'yearly' ? '#EEF2FF' : 'white', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Yearly</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#374151' }}>Note / Card Reference (Optional)</label>
                  <input type="text" value={assignForm.note} onChange={e => setAssignForm(p => ({...p, note: e.target.value}))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }} placeholder="e.g. Card ending 1234, paid via Easypaisa" />
                </div>
                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#6B7280' }}>
                  💰 Amount: <strong style={{ color: '#111827' }}>{assignForm.plan === 'pro' ? (assignForm.cycle === 'yearly' ? '$69/mo (billed yearly)' : '$79/mo') : (assignForm.cycle === 'yearly' ? '$42/mo (billed yearly)' : '$49/mo')}</strong>
                  &nbsp;·&nbsp; Expires: <strong style={{ color: '#111827' }}>{(() => { const d = new Date(); assignForm.cycle === 'yearly' ? d.setFullYear(d.getFullYear()+1) : d.setMonth(d.getMonth()+1); return d.toLocaleDateString(); })()}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button type="button" onClick={handleAssignPlan} disabled={isAssigning} style={{ padding: '13px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: isAssigning ? 'not-allowed' : 'pointer', opacity: isAssigning ? 0.7 : 1 }}>
                    {isAssigning ? '...' : 'Activate Manually (Free)'}
                  </button>
                  <button type="button" onClick={handlePayWithStripe} disabled={isAssigning} style={{ padding: '13px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: isAssigning ? 'not-allowed' : 'pointer', opacity: isAssigning ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isAssigning ? 'Processing...' : <>💳 Pay & Activate (Stripe)</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Embed Code Modal ───────────────────────────────────── */}
      {codeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>📋 Embed Code — {codeModal.name}</h2>
              <button onClick={() => setCodeModal(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>Copy and paste this code on the client's website, just before the <code>&lt;/body&gt;</code> tag:</p>
            <textarea
              readOnly
              rows={9}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #D1D5DB', fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#F9FAFB', resize: 'vertical', boxSizing: 'border-box', color: '#111827' }}
              value={`<!-- AI Chatbot by RealtyPropFlow -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${codeModal.id}",
    welcomeMessage: "${codeModal.welcome_message || 'Hi there! 👋 How can I help you today?'}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/chatbot-embed.js" defer></script>`}
            />
            <button
              onClick={() => {
                const code = `<!-- AI Chatbot by RealtyPropFlow -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${codeModal.id}",
    welcomeMessage: "${codeModal.welcome_message || 'Hi there! 👋 How can I help you today?'}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/chatbot-embed.js" defer></script>`;
                navigator.clipboard.writeText(code);
              }}
              style={{ width: '100%', marginTop: '14px', padding: '12px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>👥 Clients & Chatbots</h1>
          <p style={{ color: '#6B7280', marginTop: '4px' }}>Click on a client to see & manage their chatbots individually.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: '10px 16px', backgroundColor: '#4F46E5', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}
          >
            ➕ Add Client
          </button>
          <a
            href="/superadmin/bulk-scrape"
            style={{ padding: '10px 16px', backgroundColor: '#C9A227', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}
          >
            🏙️ Ontario Bulk Scraper
          </a>
          <button onClick={fetchUsers} style={{ padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Add New Client</h2>
              <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>✕</button>
            </div>
            
            {addResult?.type === 'success' ? (
              <div style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '16px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <h3 style={{ margin: '0 0 12px 0' }}>✅ Client & Chatbot Created!</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>The client can now log in using the email and password you set. Here is their chatbot embed code:</p>
                <textarea 
                  readOnly 
                  rows={8}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#F9FAFB', color: '#111827' }}
                  value={`<!-- AI Chatbot by RealtyPropFlow -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${addResult.bot.id}",
    welcomeMessage: "${addResult.bot.welcome_message}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/chatbot-embed.js" defer></script>`}
                />
                <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {addResult?.type === 'error' && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                    {addResult.message}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Client Name (Agent Name)</label>
                  <input required type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }} placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Email</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }} placeholder="client@example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Password</label>
                  <input required type="text" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }} placeholder="Set a secure password" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Phone Number (Optional)</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }} placeholder="+1 234 567 8900" />
                </div>
                <button type="submit" disabled={isAdding} style={{ padding: '12px', backgroundColor: '#4F46E5', color: '#FFF', border: 'none', borderRadius: '8px', cursor: isAdding ? 'not-allowed' : 'pointer', fontWeight: '700', marginTop: '8px', opacity: isAdding ? 0.7 : 1 }}>
                  {isAdding ? 'Creating Client...' : 'Create Client & Chatbot'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Loading clients...</div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>No clients found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {users.map((user) => (
            <div key={user.user_id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              
              {/* User Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flex: 1 }} onClick={() => toggleUserExpand(user.user_id)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '16px' }}>
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{user.email || 'Email not captured'}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} &nbsp;·&nbsp;
                      {(() => { const t = getTrialInfo(user); if (!t) return null; return (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{t.expired ? <span style={{ color: '#EF4444', fontWeight: '700' }}>⏰ Trial Expired</span> : <span style={{ color: t.daysLeft <= 3 ? '#F59E0B' : '#10B981', fontWeight: '700' }}>🕐 {t.daysLeft} days trial left</span>}<button onClick={(e) => { e.stopPropagation(); if(window.confirm('Reset trial to 15 days from today?')) resetTrialTo15Days(user.user_id); }} style={{ padding: '2px 7px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', borderRadius: '5px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Fix 15d</button></span>); })()}
                      &nbsp;·&nbsp;
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleUserExpand(user.user_id); }}
                        style={{ padding: '4px 10px', backgroundColor: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {expandedUser === user.user_id ? '▲ Hide Bots' : '▼ View Bots & Get Code'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      localStorage.setItem('impersonated_user_id', user.user_id);
                      localStorage.setItem('impersonated_user_email', user.email);
                      window.location.href = '/dashboard';
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: '1px solid #4F46E5', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                      backgroundColor: 'white',
                      color: '#4F46E5',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    👤 Login as Client
                  </button>
                  <span style={{
                    padding: '4px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '700',
                    backgroundColor: user.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                    color: user.status === 'Active' ? '#065F46' : '#991B1B'
                  }}>
                    {user.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                  <button
                    onClick={() => toggleUserStatus(user.user_id, user.status)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                      backgroundColor: user.status === 'Active' ? '#FEE2E2' : '#10B981',
                      color: user.status === 'Active' ? '#991B1B' : 'white',
                    }}
                  >
                    {user.status === 'Active' ? 'Deactivate All' : 'Activate Account'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.user_id, user.email)}
                    disabled={deletingUser === user.user_id}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: deletingUser === user.user_id ? 'not-allowed' : 'pointer', fontSize: '13px',
                      backgroundColor: '#111827',
                      color: 'white',
                      opacity: deletingUser === user.user_id ? 0.6 : 1
                    }}
                  >
                    {deletingUser === user.user_id ? '⏳ Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>

              {/* Expanded Bots Section */}
              {expandedUser === user.user_id && (
                <div style={{ borderTop: '1px solid #F3F4F6', backgroundColor: '#F9FAFB', padding: '16px 24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#4B5563', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🤖 Chatbots
                  </div>

                  {botsLoading[user.user_id] ? (
                    <div style={{ color: '#6B7280', fontSize: '14px', padding: '12px 0' }}>Loading bots...</div>
                  ) : !userBots[user.user_id] || userBots[user.user_id].length === 0 ? (
                    <div style={{ color: '#9CA3AF', fontSize: '14px', padding: '12px 0' }}>No chatbots created yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {userBots[user.user_id].map(bot => (
                        <div key={bot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                              {bot.bot_avatar || '🤖'} {bot.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '3px' }}>🌐 {bot.website_url}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700', backgroundColor: bot.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: bot.status === 'Active' ? '#065F46' : '#991B1B' }}>
                              {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                            <button onClick={() => { setAssignModal({ userId: user.user_id, email: user.email }); setAssignForm({ plan: 'starter', cycle: 'monthly', note: '' }); setAssignResult(null); }} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #10B981', fontWeight: '600', cursor: 'pointer', fontSize: '12px', backgroundColor: '#ECFDF5', color: '#065F46' }}>
                              💳 Assign Plan
                            </button>
                            <button onClick={() => setCodeModal(bot)} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #4F46E5', fontWeight: '600', cursor: 'pointer', fontSize: '12px', backgroundColor: 'white', color: '#4F46E5' }}>
                              📋 Get Code
                            </button>
                            <button onClick={() => toggleBotStatus(bot)} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '12px', backgroundColor: bot.status === 'Active' ? '#FEE2E2' : '#4F46E5', color: bot.status === 'Active' ? '#991B1B' : 'white' }}>
                              {bot.status === 'Active' ? 'Deactivate' : '✓ Activate Bot'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
