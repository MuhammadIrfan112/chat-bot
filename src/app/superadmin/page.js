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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>👥 Clients & Chatbots</h1>
          <p style={{ color: '#6B7280', marginTop: '4px' }}>Click on a client to see & manage their chatbots individually.</p>
        </div>
        <button onClick={fetchUsers} style={{ padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          🔄 Refresh
        </button>
      </div>

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
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} &nbsp;·&nbsp;
                      {(() => { const t = getTrialInfo(user); if (!t) return null; return t.expired ? <span style={{ color: '#EF4444', fontWeight: '700' }}>⏰ Trial Expired</span> : <span style={{ color: t.daysLeft <= 3 ? '#F59E0B' : '#10B981', fontWeight: '700' }}>🕐 {t.daysLeft} days trial left</span>; })()}
                      &nbsp;·&nbsp;
                      <span style={{ color: '#4F46E5', fontWeight: '600' }}>
                        {expandedUser === user.user_id ? '▲ Hide Bots' : '▼ View Bots'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                              backgroundColor: bot.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                              color: bot.status === 'Active' ? '#065F46' : '#991B1B'
                            }}>
                              {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                            <button
                              onClick={() => toggleBotStatus(bot)}
                              style={{
                                padding: '7px 14px', borderRadius: '7px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '12px',
                                backgroundColor: bot.status === 'Active' ? '#FEE2E2' : '#4F46E5',
                                color: bot.status === 'Active' ? '#991B1B' : 'white',
                              }}
                            >
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
