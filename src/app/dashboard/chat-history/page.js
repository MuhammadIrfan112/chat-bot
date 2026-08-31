'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatHistory() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

    // Get user's bots
    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
    if (!bots || bots.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const botIds = bots.map(b => b.id);

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .in('bot_id', botIds)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchMessages = async (sessionId) => {
    setLoadingMessages(true);
    setMessages([]);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) console.error('fetchMessages error:', error);
    setMessages(data || []);
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (!activeSession) return;
    fetchMessages(activeSession.id);
  }, [activeSession]);

  

  

  const timeAgo = (d) => {
    const diff = Math.floor((new Date() - new Date(d)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString();
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to permanently delete this conversation? This cannot be undone.')) return;
    // Delete messages first (foreign key)
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    // Then delete session
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    // Update UI
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>📜 Chat History</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Review all past conversations between your visitors and the AI.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '70vh' }}>
        {/* Sessions List */}
        <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Conversations</span>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '50px', fontSize: '12px' }}>{sessions.length}</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                No chat history found.
              </div>
            ) : (
              sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: activeSession?.id === s.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                    borderLeft: activeSession?.id === s.id ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (activeSession?.id !== s.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)' }}
                  onMouseLeave={e => { if (activeSession?.id !== s.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {s.visitor_id?.startsWith('demo_') ? (
                        <>
                          <span>🎯</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>Demo #{s.visitor_id.replace(/^demo_/, '')}</span>
                        </>
                      ) : (
                        <>
                          <span>👤</span>
                          <span>Visitor {s.visitor_id?.slice(-4)}</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                      title="Delete conversation"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        opacity: 0.5,
                        fontSize: '14px',
                        padding: '2px 4px',
                        borderRadius: '6px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{timeAgo(s.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="glass-panel" style={{ borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeSession ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>👈</div>
                <p>Select a conversation to view the transcript</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeSession.visitor_id?.startsWith('demo_') ? (
                      <>
                        <span>🎯</span>
                        <span>Demo ID: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{activeSession.visitor_id.replace(/^demo_/, '')}</span></span>
                      </>
                    ) : (
                      <span>Transcript: Visitor {activeSession.visitor_id?.slice(-4)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Started {new Date(activeSession.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => deleteSession(activeSession.id)}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#EF4444',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  🗑️ Delete Conversation
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>No messages found for this conversation.</div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', marginRight: '4px' }}>
                        {msg.role === 'user' ? 'Visitor' : 'AI Assistant'}
                      </span>
                      <div style={{
                        maxWidth: '75%',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                        border: msg.role === 'model' ? '1px solid var(--border)' : 'none',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                        borderBottomLeftRadius: msg.role === 'model' ? '4px' : '16px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
