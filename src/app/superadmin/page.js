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
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '', website_url: '' });
  // Note: industry is always 'Real Estate' — hardcoded in the API, never shown in form
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
    
    try {
      const res = await fetch('/api/superadmin/toggle-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot.id, status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setUserBots(prev => ({
        ...prev,
        [bot.user_id]: prev[bot.user_id].map(b => b.id === bot.id ? { ...b, status: bot.status } : b)
      }));
      alert('Failed to update bot status. Check logs.');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setUsers(users.map(u => u.user_id === userId ? { ...u, status: newStatus } : u));
    
    try {
      const res = await fetch('/api/superadmin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setUsers(users.map(u => u.user_id === userId ? { ...u, status: currentStatus } : u));
      alert('Failed to update user status. Check logs.');
    }
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
        setAddForm({ name: '', email: '', password: '', phone: '', website_url: '' });
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
      {/* Top Header & Action Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Clients & Chatbots
            </h1>
            <span style={{
              background: '#EEF2FF',
              color: '#4F46E5',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              border: '1px solid #C7D2FE'
            }}>
              {users.length} Total
            </span>
          </div>
          <p style={{ color: '#64748B', marginTop: '4px', fontSize: '13px', margin: '4px 0 0 0' }}>
            Manage client accounts, active chatbots, subscriptions, and live scraping links.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(79,70,229,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <span>➕</span> Add Client
          </button>

          <button
            onClick={fetchUsers}
            style={{
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            <span>🔄</span> Refresh
          </button>

          <button
            onClick={async () => {
              if (!confirm('This will fix bot_id links for all existing clients. Proceed?')) return;
              const res = await fetch('/api/superadmin/fix-bot-links', { method: 'POST' });
              const data = await res.json();
              alert(`✅ Fixed: ${data.fixed} clients\n❌ Failed: ${data.failed || 0}\n\n${(data.log || []).join('\n')}`);
              fetchUsers();
            }}
            style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>🔧</span> Fix Bot Links
          </button>

          <button
            onClick={async () => {
              if (!confirm('⚠️ This will set ALL existing bots:\n• industry = "Real Estate"\n• plan = "premium"\n\nThis allows all bots to show Live Properties (like Shawna\'s).\n\nProceed?')) return;
              const res = await fetch('/api/superadmin/fix-all-bots', { method: 'POST' });
              const data = await res.json();
              if (data.success) {
                alert(`✅ Done!\n\nTotal bots: ${data.total || 0}\nFixed: ${data.fixed} bots\nAlready OK: ${data.alreadyOk || 0}\n\n${(data.log || []).join('\n')}`);
                fetchUsers();
              } else {
                alert('❌ Error: ' + (data.error || 'Unknown error'));
              }
            }}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(16,185,129,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <span>🏡</span> Fix All Bots (Live Properties)
          </button>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.35)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>➕ Add New Client</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Create a client account and configure their real estate bot</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            {addResult?.type === 'success' ? (
              <div style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '20px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800' }}>✅ Client & Chatbot Created!</h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '13px', lineHeight: '1.5' }}>The client can now log in using the credentials you set. Here is their chatbot embed code:</p>
                <textarea 
                  readOnly 
                  rows={8}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'monospace', fontSize: '11px', backgroundColor: '#FFFFFF', color: '#111827', boxSizing: 'border-box' }}
                  value={`<!-- AI Chatbot by RealtyPropFlow -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${addResult.bot.id}",
    welcomeMessage: "${addResult.bot.welcome_message}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/chatbot-embed.js" defer></script>`}
                />
                <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {addResult?.type === 'error' && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid #FCA5A5' }}>
                    {addResult.message}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Client Name (Agent Name)</label>
                  <input required type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Email Address</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="client@example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Password</label>
                  <input required type="text" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="Set a secure password" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Phone Number (Optional)</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Website URL (For Property Auto-Scraping)</label>
                  <input required type="url" value={addForm.website_url || ''} onChange={e => setAddForm({...addForm, website_url: e.target.value})} style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="https://www.remax.com" />
                </div>
                <button type="submit" disabled={isAdding} style={{ padding: '13px', background: 'linear-gradient(135deg, #4F46E5, #3B82F6)', color: '#FFF', border: 'none', borderRadius: '10px', cursor: isAdding ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '14px', marginTop: '6px', opacity: isAdding ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
                  {isAdding ? 'Creating Client...' : 'Create Client & Chatbot'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Clients List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>Loading clients...</div>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
          <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>No clients found</div>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Get started by adding your first client using the button above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {users.map((user) => (
            <div
              key={user.user_id}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              {/* User Main Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 22px',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: 1, minWidth: '260px' }}
                  onClick={() => toggleUserExpand(user.user_id)}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '800',
                    fontSize: '17px',
                    boxShadow: '0 3px 10px rgba(79,70,229,0.25)',
                    flexShrink: 0
                  }}>
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '15px', letterSpacing: '-0.01em' }}>
                      {user.email || 'Email not captured'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Joined: <strong style={{ color: '#334155' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</strong></span>
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      {(() => {
                        const t = getTrialInfo(user);
                        if (!t) return null;
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {t.expired ? (
                              <span style={{ color: '#EF4444', fontWeight: '800', background: '#FEE2E2', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                ⏰ Trial Expired
                              </span>
                            ) : (
                              <span style={{ color: t.daysLeft <= 3 ? '#B45309' : '#047857', background: t.daysLeft <= 3 ? '#FEF3C7' : '#D1FAE5', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '11px' }}>
                                🕐 {t.daysLeft} days trial left
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Reset trial to 15 days from today?')) resetTrialTo15Days(user.user_id);
                              }}
                              style={{
                                padding: '2px 8px',
                                background: '#FFFBEB',
                                color: '#92400E',
                                border: '1px solid #FDE68A',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              Fix 15d
                            </button>
                          </span>
                        );
                      })()}
                      <span style={{ color: '#CBD5E1' }}>•</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleUserExpand(user.user_id); }}
                        style={{
                          padding: '3px 10px',
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                          border: '1px solid #C7D2FE',
                          borderRadius: '6px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {expandedUser === user.user_id ? '▲ Hide Bots' : '▼ View Bots & Get Code'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      localStorage.setItem('impersonated_user_id', user.user_id);
                      localStorage.setItem('impersonated_user_email', user.email);
                      window.location.href = '/dashboard';
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #C7D2FE',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                      color: '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>👤</span> Login as Client
                  </button>

                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: user.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                    color: user.status === 'Active' ? '#065F46' : '#991B1B',
                    border: user.status === 'Active' ? '1px solid #A7F3D0' : '1px solid #FECACA'
                  }}>
                    {user.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>

                  <button
                    onClick={() => toggleUserStatus(user.user_id, user.status)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '12px',
                      backgroundColor: user.status === 'Active' ? '#FEE2E2' : '#10B981',
                      color: user.status === 'Active' ? '#991B1B' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    {user.status === 'Active' ? 'Deactivate All' : 'Activate Account'}
                  </button>

                  <button
                    onClick={() => deleteUser(user.user_id, user.email)}
                    disabled={deletingUser === user.user_id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontWeight: '700',
                      cursor: deletingUser === user.user_id ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      backgroundColor: '#0F172A',
                      color: 'white',
                      opacity: deletingUser === user.user_id ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {deletingUser === user.user_id ? '⏳ Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>

              {/* Expanded Bots Section */}
              {expandedUser === user.user_id && (
                <div style={{ borderTop: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', padding: '18px 24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    🤖 Active Chatbots for this Client
                  </div>

                  {botsLoading[user.user_id] ? (
                    <div style={{ color: '#64748B', fontSize: '13px', padding: '12px 0' }}>Loading bots...</div>
                  ) : !userBots[user.user_id] || userBots[user.user_id].length === 0 ? (
                    <div style={{ color: '#94A3B8', fontSize: '13px', padding: '12px 0' }}>No chatbots created yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {userBots[user.user_id].map(bot => (
                        <div key={bot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '14px' }}>
                              {bot.bot_avatar || '🤖'} {bot.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>🌐 {bot.website_url || 'No URL'}</div>
                            <div style={{ fontSize: '11px', marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '20px', backgroundColor: bot.industry === 'Real Estate' ? '#D1FAE5' : '#FEF3C7', color: bot.industry === 'Real Estate' ? '#065F46' : '#92400E', fontWeight: '800' }}>
                                {bot.industry === 'Real Estate' ? '🏡 Real Estate' : `⚠️ ${bot.industry || 'No Industry'}`}
                              </span>
                              <span style={{ padding: '2px 8px', borderRadius: '20px', backgroundColor: bot.plan === 'premium' ? '#EEF2FF' : '#FEF3C7', color: bot.plan === 'premium' ? '#4338CA' : '#92400E', fontWeight: '800' }}>
                                {bot.plan === 'premium' ? '⭐ Premium' : `⚠️ ${bot.plan || 'No Plan'}`}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '800', backgroundColor: bot.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: bot.status === 'Active' ? '#065F46' : '#991B1B' }}>
                              {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                            <button onClick={() => { setAssignModal({ userId: user.user_id, email: user.email }); setAssignForm({ plan: 'starter', cycle: 'monthly', note: '' }); setAssignResult(null); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #A7F3D0', fontWeight: '700', cursor: 'pointer', fontSize: '11px', backgroundColor: '#ECFDF5', color: '#065F46' }}>
                              💳 Assign Plan
                            </button>
                            <button onClick={() => setCodeModal(bot)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: '700', cursor: 'pointer', fontSize: '11px', backgroundColor: 'white', color: '#4F46E5' }}>
                              📋 Get Code
                            </button>
                            <button onClick={() => toggleBotStatus(bot)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '11px', backgroundColor: bot.status === 'Active' ? '#FEE2E2' : '#4F46E5', color: bot.status === 'Active' ? '#991B1B' : 'white' }}>
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
