'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LiveChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [adminInput, setAdminInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();

    // Auto-refresh sessions every 5 seconds
    const interval = setInterval(fetchSessions, 5000);

    // Also use Realtime as backup
    const sessionSub = supabase
      .channel('sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, fetchSessions)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sessionSub);
    };
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    fetchMessages(activeSession.id);

    // Realtime: listen for new messages in active session
    const msgSub = supabase
      .channel(`messages-${activeSession.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${activeSession.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(msgSub);
  }, [activeSession]);



  const fetchSessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // Get user's bots
    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId);
    if (!bots || bots.length === 0) {
      setSessions([]);
      return;
    }
    const botIds = bots.map(b => b.id);

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .in('bot_id', botIds)
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      setSessions(data);
    }
  };

  const fetchMessages = async (sessionId) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const handleTakeover = async (sessionId, takeover) => {
    await fetch('/api/takeover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, takeover })
    });
    fetchSessions();
    if (activeSession?.id === sessionId) {
      setActiveSession(prev => ({ ...prev, is_human_takeover: takeover }));
    }
  };

  const sendAdminMessage = async () => {
    if (!adminInput.trim() || !activeSession) return;
    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: activeSession.id, role: 'admin', content: adminInput })
    });
    setAdminInput('');
  };

  const timeAgo = (d) => {
    const diff = Math.floor((new Date() - new Date(d)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>💬 Live Chat Inbox</h1>
      <p style={{ color: '#6B7280', marginBottom: '24px' }}>Monitor all visitor chats in real-time. Take over from AI anytime.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '70vh' }}>
        {/* Sessions List */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', fontWeight: '700', color: '#111827' }}>
            Active Sessions ({sessions.length})
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
              No active chats yet
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => { setActiveSession(s); fetchMessages(s.id); }}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F3F4F6',
                  backgroundColor: activeSession?.id === s.id ? '#EEF2FF' : 'transparent',
                  borderLeft: activeSession?.id === s.id ? '3px solid #4F46E5' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                    👤 {s.visitor_id?.slice(0, 12)}...
                  </div>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '50px',
                    fontWeight: '600',
                    backgroundColor: s.is_human_takeover ? '#FEF3C7' : '#D1FAE5',
                    color: s.is_human_takeover ? '#92400E' : '#065F46'
                  }}>
                    {s.is_human_takeover ? '👨 Human' : '🤖 AI'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{timeAgo(s.created_at)}</div>
              </div>
            ))
          )}
        </div>

        {/* Chat Window */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
          {!activeSession ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
                <p>Select a session to view the chat</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>Session: {activeSession.visitor_id?.slice(0, 16)}...</div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    {activeSession.is_human_takeover ? '👨 You are in control' : '🤖 AI is handling this chat'}
                  </div>
                </div>
                <button
                  onClick={() => handleTakeover(activeSession.id, !activeSession.is_human_takeover)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: activeSession.is_human_takeover ? '#D1FAE5' : '#FEF3C7',
                    color: activeSession.is_human_takeover ? '#065F46' : '#92400E',
                    fontSize: '14px'
                  }}
                >
                  {activeSession.is_human_takeover ? '🤖 Hand back to AI' : '👨 Take Over Chat'}
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      backgroundColor: msg.role === 'user' ? '#4F46E5' : msg.role === 'admin' ? '#10B981' : '#F3F4F6',
                      color: msg.role === 'user' || msg.role === 'admin' ? 'white' : '#111827'
                    }}>
                      {msg.role === 'admin' && <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>👨 Admin</div>}
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Input */}
              {activeSession.is_human_takeover && (
                <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '12px' }}>
                  <input
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendAdminMessage()}
                    placeholder="Type your reply to visitor..."
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                  />
                  <button
                    onClick={sendAdminMessage}
                    style={{ backgroundColor: '#10B981', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
