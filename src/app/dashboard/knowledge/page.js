'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function KnowledgeBase() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [knowledge, setKnowledge] = useState([]);
  const [hasBot, setHasBot] = useState(false);
  const [botId, setBotId] = useState(null);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = localStorage.getItem('impersonated_user_id') || session.user.id;

    // Check if user has a bot
    const { data: bots } = await supabase.from('bots').select('id').eq('user_id', userId).limit(1);
    
    if (!bots || bots.length === 0) {
      setHasBot(false);
      setKnowledge([]);
      return;
    }

    setHasBot(true);
    setBotId(bots[0].id);

    // Fetch knowledge for their bot
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('bot_id', bots[0].id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKnowledge(data);
    }
  };

  const handleUploadText = async () => {
    if (!text.trim() || !botId) return;
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/upload-knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, bot_id: botId })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Knowledge successfully added to AI Brain!');
        fetchKnowledge(); // Refresh the list
      } else {
        setMessage('❌ Error: ' + data.error);
      }
    } catch (e) {
      setMessage('❌ Error connecting to server.');
    }
    setLoading(false);
    setText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !botId) return;
    
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bot_id', botId);

    try {
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ File "${file.name}" successfully added to AI Brain!`);
        fetchKnowledge();
      } else {
        setMessage('❌ Error: ' + data.error);
      }
    } catch (e) {
      setMessage('❌ Error uploading file.');
    }
    
    e.target.value = ''; // Reset input
    setLoading(false);
  };

  if (!hasBot) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Create a Chatbot First</h2>
        <p style={{ color: '#6B7280' }}>You need to create a chatbot before you can train it with knowledge.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>📚 AI Knowledge Base (RAG)</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Train your chatbot by pasting business documents, FAQs, or rules here.</p>

      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '800px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Add New Knowledge</h2>
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your business info here... (e.g., 'We offer video editing for $500/month. Our support email is help@socialmedia110.com')"
          style={{ width: '100%', height: '200px', padding: '16px', borderRadius: '8px', border: '1px solid #D1D5DB', marginBottom: '16px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }}
        />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={handleUploadText}
            disabled={loading}
            style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Training AI...' : 'Train Text 🧠'}
          </button>
          
          <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600' }}>OR</div>
          
          <label style={{ 
            backgroundColor: '#10B981', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: '8px'
          }}>
            📁 Upload PDF / TXT
            <input 
              type="file" 
              accept=".txt,.pdf" 
              onChange={handleFileUpload}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {message && <p style={{ marginTop: '16px', fontWeight: '500', color: message.includes('Error') ? '#EF4444' : '#10B981' }}>{message}</p>}
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Existing Knowledge</h2>
      {knowledge.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No knowledge items added yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {knowledge.map((k) => (
            <div key={k.id} style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              {k.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
