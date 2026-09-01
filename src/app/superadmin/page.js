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
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedPasswordId, setCopiedPasswordId] = useState(null);

  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '', website_url: '' });
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

  const togglePasswordReveal = (userId, e) => {
    e?.stopPropagation();
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyPassword = (password, userId, e) => {
    e?.stopPropagation();
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPasswordId(userId);
    setTimeout(() => setCopiedPasswordId(null), 2000);
  };

  const toggleBotStatus = async (bot) => {
    const newStatus = bot.status === 'Active' ? 'Inactive' : 'Active';
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
      setUserBots(prev => ({
        ...prev,
        [bot.user_id]: prev[bot.user_id].map(b => b.id === bot.id ? { ...b, status: bot.status } : b)
      }));
      alert('Failed to update bot status. Check logs.');
    }
  };

  const toggleUserStatus = async (userId, currentStatus, e) => {
    e?.stopPropagation();
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
      setUsers(users.map(u => u.user_id === userId ? { ...u, status: currentStatus } : u));
      alert('Failed to update user status. Check logs.');
    }
  };

  const deleteUser = async (userId, email, e) => {
    e?.stopPropagation();
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
    e?.preventDefault();
    if (!assignModal) return;
    setIsAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: assignForm.plan === 'premium' || assignForm.plan === 'pro' ? 'pro' : 'starter',
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
    e?.preventDefault();
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
      if (data.success) {
        setAddResult({ type: 'success', bot: data.bot });
        fetchUsers();
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

  // Filter users by search
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.website_url && user.website_url.toLowerCase().includes(q)) ||
      (user.plan && user.plan.toLowerCase().includes(q))
    );
  });

  const activeCount = users.filter(u => u.status === 'Active').length;
  const premiumCount = users.filter(u => ['pro', 'premium'].includes((u.plan || '').toLowerCase())).length;

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* ── Assign Plan Modal ──────────────────────────────────── */}
      {assignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>💳 Assign / Pay Plan</h2>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>{assignModal.email}</p>
              </div>
              <button onClick={() => { setAssignModal(null); setAssignResult(null); }} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {assignResult?.type === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontSize: '18px', color: '#065F46', margin: '0 0 8px', fontWeight: '800' }}>Plan Assigned Successfully!</h3>
                <p style={{ fontSize: '13px', color: '#64748B' }}>Plan: <strong style={{ color: '#0F172A', textTransform: 'capitalize' }}>{assignResult.plan}</strong></p>
                <p style={{ fontSize: '13px', color: '#64748B' }}>Valid until: <strong style={{ color: '#0F172A' }}>{new Date(assignResult.endDate).toLocaleDateString()}</strong></p>
                <button onClick={() => { setAssignModal(null); setAssignResult(null); }} style={{ width: '100%', marginTop: '20px', padding: '12px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assignResult?.type === 'error' && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid #FECACA' }}>
                    {assignResult.message}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#0F172A' }}>Select Plan Tier</label>
                  <select
                    value={assignForm.plan}
                    onChange={e => setAssignForm({ ...assignForm, plan: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="starter" style={{ color: '#0F172A', backgroundColor: '#FFFFFF' }}>📦 Starter / Standard ($29/mo)</option>
                    <option value="pro" style={{ color: '#0F172A', backgroundColor: '#FFFFFF' }}>⭐ Pro / Premium ($79/mo)</option>
                    <option value="enterprise" style={{ color: '#0F172A', backgroundColor: '#FFFFFF' }}>🚀 Enterprise ($199/mo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#0F172A' }}>Select Billing Cycle</label>
                  <select
                    value={assignForm.cycle}
                    onChange={e => setAssignForm({ ...assignForm, cycle: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="monthly" style={{ color: '#0F172A', backgroundColor: '#FFFFFF' }}>📅 Monthly (Auto-renews or 30 days)</option>
                    <option value="yearly" style={{ color: '#0F172A', backgroundColor: '#FFFFFF' }}>📆 Yearly (365 days)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  {/* Option 1: Free / Direct Assign */}
                  <button
                    type="button"
                    onClick={handleAssignPlan}
                    disabled={isAssigning}
                    style={{
                      width: '100%',
                      padding: '13px',
                      background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '800',
                      cursor: isAssigning ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isAssigning ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
                    }}
                  >
                    <span>✓</span> {isAssigning ? 'Processing...' : 'Confirm Plan (Free / Admin Override)'}
                  </button>

                  {/* Option 2: Pay with Stripe */}
                  <button
                    type="button"
                    onClick={handlePayWithStripe}
                    disabled={isAssigning}
                    style={{
                      width: '100%',
                      padding: '13px',
                      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '800',
                      cursor: isAssigning ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isAssigning ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                    }}
                  >
                    <span>💳</span> Pay with Stripe (Client Card)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Add Client Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>➕ Add New Client</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>Creates user account, AI chatbot, and stores credentials</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {addResult?.type === 'success' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ fontSize: '18px', color: '#065F46', margin: '0 0 6px', fontWeight: '800' }}>Client & Chatbot Created!</h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>Embed code is ready to install:</p>
                <textarea
                  readOnly
                  rows={6}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontFamily: 'monospace', fontSize: '11px', backgroundColor: '#F8FAFC', color: '#0F172A', boxSizing: 'border-box' }}
                  value={`<!-- AI Chatbot by RealtyPropFlow -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${addResult.bot?.id}",
    welcomeMessage: "${addResult.bot?.welcome_message || 'Hi there! 👋 How can I help you today?'}"
  };
</script>
<script src="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/chatbot-embed.js" defer></script>`}
                />
                <button onClick={() => { setShowAddModal(false); setAddResult(null); }} style={{ width: '100%', marginTop: '16px', padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {addResult?.type === 'error' && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid #FCA5A5' }}>
                    {addResult.message}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px', color: '#334155' }}>Client Name (Agent Name) *</label>
                  <input required type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="e.g. Sandra Roongsang" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px', color: '#334155' }}>Email Address *</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="client@example.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px', color: '#334155' }}>Password *</label>
                  <input required type="text" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="Set password (will be stored for reference)" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px', color: '#334155' }}>Phone Number (Optional)</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px', color: '#334155' }}>Website URL (For Property Auto-Scraping) *</label>
                  <input required type="url" value={addForm.website_url || ''} onChange={e => setAddForm({...addForm, website_url: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }} placeholder="https://www.remax.com" />
                </div>
                <button type="submit" disabled={isAdding} style={{ padding: '13px', background: 'linear-gradient(135deg, #4F46E5, #3B82F6)', color: '#FFF', border: 'none', borderRadius: '10px', cursor: isAdding ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '14px', marginTop: '6px', opacity: isAdding ? 0.7 : 1, boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
                  {isAdding ? 'Creating Client...' : 'Create Client & Chatbot'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Embed Code Modal ────────────────────────────────────── */}
      {codeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>📋 Embed Code</h2>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>{codeModal.name}</p>
              </div>
              <button onClick={() => setCodeModal(null)} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
              Paste this snippet into the client's website just before <code>&lt;/body&gt;</code>:
            </p>
            <textarea
              readOnly
              rows={8}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontFamily: 'monospace', fontSize: '11px', backgroundColor: '#F8FAFC', color: '#0F172A', boxSizing: 'border-box' }}
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
                alert('Copied to clipboard! 📋');
              }}
              style={{ width: '100%', marginTop: '14px', padding: '12px', backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* ── Top Header & Stats Overview ──────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Clients & Chatbots
            </h1>
            <p style={{ color: '#64748B', marginTop: '4px', fontSize: '14px', margin: '4px 0 0 0' }}>
              Manage clients, passwords, active subscriptions, and AI chatbots.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '11px 20px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span style={{ fontSize: '15px' }}>➕</span> Add Client
            </button>

            <button
              onClick={fetchUsers}
              style={{
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
                padding: '11px 14px',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔧</span> Fix Links
            </button>

            <button
              onClick={async () => {
                if (!confirm('⚠️ Set ALL bots to "Real Estate" & "premium" (Live Properties enabled)?')) return;
                const res = await fetch('/api/superadmin/fix-all-bots', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                  alert(`✅ Done!\nFixed: ${data.fixed} bots\nAlready OK: ${data.alreadyOk || 0}`);
                  fetchUsers();
                } else {
                  alert('❌ Error: ' + (data.error || 'Unknown error'));
                }
              }}
              style={{
                padding: '11px 16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 3px 10px rgba(16,185,129,0.25)'
              }}
            >
              <span>🏡</span> Fix All Live Bots
            </button>
          </div>
        </div>

        {/* Quick Stats & Search Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>TOTAL CLIENTS</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>{users.length}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>ACTIVE ACCOUNTS</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#059669', marginTop: '4px' }}>{activeCount}</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: '700' }}>PREMIUM SUBSCRIBERS</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#4F46E5', marginTop: '4px' }}>{premiumCount}</div>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search clients by email, website, or plan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '500',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Clients List ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>Loading clients...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
          <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>
            {searchQuery ? 'No matching clients found' : 'No clients found'}
          </div>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            {searchQuery ? 'Try clearing the search query' : 'Get started by adding your first client using the button above.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredUsers.map((user) => {
            const isExpanded = expandedUser === user.user_id;
            const trial = getTrialInfo(user);
            const effectivePlan = (user.plan || (user.status === 'Active' ? 'pro' : 'none')).toLowerCase();
            const isPremium = effectivePlan === 'premium' || effectivePlan === 'pro';
            const isPasswordRevealed = revealedPasswords[user.user_id];
            const isCopied = copiedPasswordId === user.user_id;

            return (
              <div
                key={user.user_id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: isExpanded ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
                  boxShadow: isExpanded ? '0 10px 25px -5px rgba(99,102,241,0.1)' : '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden'
                }}
              >
                {/* ── Client Header Row (Clean & Minimalist) ── */}
                <div
                  onClick={() => toggleUserExpand(user.user_id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: isExpanded ? '#F8FAFC' : 'white',
                    borderBottom: isExpanded ? '1px solid #EEF2F6' : 'none',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {/* Left: Avatar + Email + Expand hint */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: isExpanded
                        ? 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)'
                        : 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '16px',
                      flexShrink: 0,
                      boxShadow: '0 3px 8px rgba(79,70,229,0.2)'
                    }}>
                      {(user.email || 'U')[0].toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', color: '#0F172A', fontSize: '15px', letterSpacing: '-0.01em' }}>
                          {user.email || 'No email recorded'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: isExpanded ? '#4F46E5' : '#94A3B8',
                          fontWeight: '700',
                          backgroundColor: isExpanded ? '#EEF2FF' : '#F1F5F9',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          transition: 'all 0.15s ease'
                        }}>
                          {isExpanded ? '▲ Close Details' : '▼ Click for Details'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span style={{ color: isPremium ? '#4338CA' : '#64748B', fontWeight: '700' }}>
                          {isPremium ? '⭐ Premium' : '📦 Standard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {/* Login as Client */}
                    <button
                      onClick={() => {
                        localStorage.setItem('impersonated_user_id', user.user_id);
                        localStorage.setItem('impersonated_user_email', user.email);
                        window.location.href = '/dashboard';
                      }}
                      title="Open client dashboard"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '9px',
                        border: '1px solid #C7D2FE',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <span>👤</span> Login as Client
                    </button>

                    {/* Status Badge & Toggle */}
                    <button
                      onClick={(e) => toggleUserStatus(user.user_id, user.status, e)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '9px',
                        border: 'none',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '12px',
                        backgroundColor: user.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                        color: user.status === 'Active' ? '#166534' : '#991B1B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{user.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => deleteUser(user.user_id, user.email, e)}
                      disabled={deletingUser === user.user_id}
                      title="Permanently delete user"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '9px',
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
                      {deletingUser === user.user_id ? '⏳' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>

                {/* ── Detailed Expanded View ── */}
                {isExpanded && (
                  <div style={{ padding: '24px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                      
                      {/* 📋 Card 1: Account & Credentials */}
                      <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🔐</span> Account & Login Credentials
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Email */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Email Address:</span>
                            <strong style={{ color: '#0F172A' }}>{user.email || 'N/A'}</strong>
                          </div>

                          {/* Password */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Password:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {user.plain_password ? (
                                <>
                                  <span style={{ fontFamily: isPasswordRevealed ? 'inherit' : 'monospace', fontWeight: '800', color: isPasswordRevealed ? '#0F172A' : '#64748B', fontSize: '13px' }}>
                                    {isPasswordRevealed ? user.plain_password : '••••••••••••'}
                                  </span>
                                  <button
                                    onClick={(e) => togglePasswordReveal(user.user_id, e)}
                                    title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                                  >
                                    {isPasswordRevealed ? '👁️‍🗨️' : '👁️'}
                                  </button>
                                  <button
                                    onClick={(e) => copyPassword(user.plain_password, user.user_id, e)}
                                    title="Copy Password"
                                    style={{
                                      padding: '3px 8px',
                                      backgroundColor: isCopied ? '#DCFCE7' : '#EEF2FF',
                                      color: isCopied ? '#166534' : '#4F46E5',
                                      border: `1px solid ${isCopied ? '#86EFAC' : '#C7D2FE'}`,
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isCopied ? '✓ Copied' : '📋 Copy'}
                                  </button>
                                </>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>
                                  Not saved (Created before plain storage)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Website */}
                          {user.website_url && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                              <span style={{ color: '#64748B', fontWeight: '600' }}>Website URL:</span>
                              <a href={user.website_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🔗 Visit Website
                              </a>
                            </div>
                          )}

                          {/* Created Date */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Member Since:</span>
                            <span style={{ color: '#334155', fontWeight: '700' }}>
                              {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 💳 Card 2: Subscription & Trial Plan */}
                      <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>💳</span> Plan & Subscription Details
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Plan Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Active Plan:</span>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '800',
                              backgroundColor: isPremium ? '#EEF2FF' : '#F1F5F9',
                              color: isPremium ? '#4338CA' : '#475569',
                              border: isPremium ? '1px solid #C7D2FE' : '1px solid #E2E8F0'
                            }}>
                              {isPremium ? '⭐ Premium Plan' : '📦 Standard Plan'}
                            </span>
                          </div>

                          {/* Trial Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Trial Period:</span>
                            {trial ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  color: trial.expired ? '#EF4444' : (trial.daysLeft <= 3 ? '#B45309' : '#047857'),
                                  background: trial.expired ? '#FEE2E2' : (trial.daysLeft <= 3 ? '#FEF3C7' : '#D1FAE5'),
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: '800',
                                  fontSize: '11px'
                                }}>
                                  {trial.expired ? '⏰ Expired' : `🕐 ${trial.daysLeft} days left`}
                                </span>
                                <button
                                  onClick={() => resetTrialTo15Days(user.user_id)}
                                  title="Extend trial by 15 days"
                                  style={{
                                    padding: '2px 8px',
                                    background: '#FFFBEB',
                                    color: '#92400E',
                                    border: '1px solid #FDE68A',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                  }}
                                >
                                  +15 Days
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '12px' }}>No trial set</span>
                            )}
                          </div>

                          {/* Billing Cycle */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#64748B', fontWeight: '600' }}>Billing Cycle:</span>
                            <span style={{ color: '#334155', fontWeight: '700', textTransform: 'capitalize' }}>
                              {user.billing_cycle || 'Monthly'}
                            </span>
                          </div>

                          {/* Assign / Change Plan Button */}
                          <button
                            onClick={() => {
                              setAssignModal({ userId: user.user_id, email: user.email });
                              setAssignForm({ plan: isPremium ? 'pro' : 'starter', cycle: 'monthly', note: '' });
                              setAssignResult(null);
                            }}
                            style={{
                              marginTop: '6px',
                              padding: '9px 14px',
                              borderRadius: '9px',
                              border: '1px solid #A7F3D0',
                              fontWeight: '800',
                              cursor: 'pointer',
                              fontSize: '12px',
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                          >
                            <span>💳</span> Assign / Change Subscription Plan
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 🤖 Section: Active Chatbots */}
                    <div style={{ marginTop: '18px', backgroundColor: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🤖</span> AI Chatbots Assigned to this Client
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                          {userBots[user.user_id]?.length || 0} Bot(s)
                        </span>
                      </div>

                      {botsLoading[user.user_id] ? (
                        <div style={{ color: '#64748B', fontSize: '13px', padding: '16px 0', textAlign: 'center' }}>
                          ⏳ Loading chatbots...
                        </div>
                      ) : !userBots[user.user_id] || userBots[user.user_id].length === 0 ? (
                        <div style={{ color: '#94A3B8', fontSize: '13px', padding: '16px 0', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px' }}>
                          No chatbots found for this client yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {userBots[user.user_id].map(bot => (
                            <div
                              key={bot.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: '#F8FAFC',
                                padding: '14px 18px',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                flexWrap: 'wrap',
                                gap: '12px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {bot.bot_avatar && (bot.bot_avatar.startsWith('http') || bot.bot_avatar.startsWith('/')) ? (
                                  <img 
                                    src={bot.bot_avatar} 
                                    alt="Bot Avatar" 
                                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #CBD5E1' }} 
                                  />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    {bot.bot_avatar || '🤖'}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '14px' }}>
                                    {bot.name}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span>🌐 {bot.website_url || 'No URL'}</span>
                                    <span style={{ color: '#CBD5E1' }}>•</span>
                                    <span style={{ padding: '1px 7px', borderRadius: '12px', backgroundColor: bot.industry === 'Real Estate' ? '#D1FAE5' : '#FEF3C7', color: bot.industry === 'Real Estate' ? '#065F46' : '#92400E', fontWeight: '800', fontSize: '10px' }}>
                                      {bot.industry === 'Real Estate' ? '🏡 Real Estate' : bot.industry}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '800', backgroundColor: bot.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: bot.status === 'Active' ? '#065F46' : '#991B1B' }}>
                                  {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                                </span>

                                <button
                                  onClick={() => setCodeModal(bot)}
                                  style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: '700', cursor: 'pointer', fontSize: '12px', backgroundColor: 'white', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  📋 Get Code
                                </button>

                                <button
                                  onClick={() => toggleBotStatus(bot)}
                                  style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '12px', backgroundColor: bot.status === 'Active' ? '#FEE2E2' : '#4F46E5', color: bot.status === 'Active' ? '#991B1B' : 'white' }}
                                >
                                  {bot.status === 'Active' ? 'Deactivate' : '✓ Activate'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
