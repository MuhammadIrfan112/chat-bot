'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MyBots() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [embedBot, setEmbedBot] = useState(null);
  const [userId, setUserId] = useState(null);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    name: '',
    website_url: '',
    calendly_link: '',
    welcome_message: 'Hi there! 👋 How can I help you today?',
    primary_color: '#4F46E5',
    bot_avatar: '🤖',
  });

  const avatarOptions = ['🤖', '👩', '👨', '👩‍💼', '👨‍💼', '🦸‍♀️', '🦸‍♂️', '🧠'];

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);
    fetchBots(session.user.id);
  };

  const fetchBots = async (uid) => {
    const { data } = await supabase
      .from('bots')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    setBots(data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (bots.length >= 1) {
      setCreateError('You can only create one chatbot per account. Please upgrade for more.');
      return;
    }
    if (!form.name.trim() || !form.website_url.trim()) return;
    setCreating(true);
    setCreateError('');

    const { data, error } = await supabase.from('bots').insert({
      user_id: userId,
      name: form.name,
      website_url: form.website_url,
      calendly_link: form.calendly_link,
      welcome_message: form.welcome_message,
      primary_color: form.primary_color,
      bot_avatar: form.bot_avatar,
      status: 'Active',
    }).select().single();

    if (error) {
      setCreateError('❌ Error: ' + error.message);
      setCreating(false);
      return;
    }

    if (data) {
      setShowForm(false);
      setCreateError('');
      setForm({ name: '', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖' });
      fetchBots(userId);
      setEmbedBot(data);
    }
    setCreating(false);
  };

  const getEmbedCode = (bot) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chat-bot-ruddy-one.vercel.app';
    return `<!-- AI Chatbot by SaaS Platform -->
<script>
  window.CHATBOT_CONFIG = {
    botId: "${bot.id}",
    welcomeMessage: "${bot.welcome_message || 'Hi! How can I help you?'}"
  };
</script>
<script src="${siteUrl}/api/embed" async></script>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>🤖 My Chatbots</h1>
          <p style={{ color: '#6B7280' }}>Create and manage your AI chatbots. Get the embed code for your website.</p>
        </div>
        {bots.length === 0 && (
          <button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
          >
            + Create New Bot
          </button>
        )}
      </div>

      {/* Create Bot Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>🚀 Create New Chatbot</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Bot Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. My Business Bot"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Your Website URL *</label>
                <input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  required
                  placeholder="https://yourbusiness.com"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Calendly Link <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</span></label>
                <input
                  value={form.calendly_link}
                  onChange={(e) => setForm({ ...form, calendly_link: e.target.value })}
                  placeholder="https://calendly.com/your-name/30min"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px' }}
                />
                <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '6px', fontWeight: '500' }}>💡 Note: If you want the "📅 Book a Free Call" button to appear in your chatbot, you must provide your Calendly link here.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Welcome Message</label>
                <input
                  value={form.welcome_message}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Hi! How can I help you today?"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Choose Avatar Icon</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {avatarOptions.map((icon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm({ ...form, bot_avatar: icon })}
                        style={{
                          width: '44px',
                          height: '44px',
                          fontSize: '24px',
                          borderRadius: '8px',
                          border: form.bot_avatar === icon ? '2px solid #4F46E5' : '1px solid #D1D5DB',
                          backgroundColor: form.bot_avatar === icon ? '#EEF2FF' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: '#374151', fontSize: '14px' }}>Primary Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      style={{ width: '48px', height: '42px', borderRadius: '8px', border: '1px solid #D1D5DB', cursor: 'pointer', padding: '2px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500', backgroundColor: form.primary_color, color: 'white', padding: '6px 14px', borderRadius: '6px' }}>
                      Preview
                    </span>
                  </div>
                </div>
              </div>

              {createError && (
                <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '500' }}>
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                style={{ backgroundColor: '#4F46E5', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '16px', marginTop: '8px', opacity: creating ? 0.7 : 1 }}
              >
                {creating ? 'Creating...' : '🚀 Create Chatbot'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {embedBot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>🎉 Chatbot Created!</h2>
              <button onClick={() => setEmbedBot(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            <p style={{ color: '#6B7280', marginBottom: '20px' }}>Copy this code and paste it into your website's HTML (before the closing <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>&lt;/body&gt;</code> tag):</p>
            <pre style={{ backgroundColor: '#1E293B', color: '#A3E635', padding: '20px', borderRadius: '12px', fontSize: '13px', overflowX: 'auto', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {getEmbedCode(embedBot)}
            </pre>
            <button
              onClick={() => copyToClipboard(getEmbedCode(embedBot))}
              style={{ marginTop: '16px', width: '100%', padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
            >
              📋 Copy Embed Code
            </button>
          </div>
        </div>
      )}

      {/* Bots List */}
      {bots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '2px dashed #E5E7EB' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No chatbots yet</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>Create your first chatbot to start capturing leads automatically.</p>
          <button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 28px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
          >
            + Create First Chatbot
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {bots.map(bot => (
            <div key={bot.id} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{bot.name}</h3>
                  <span style={{ backgroundColor: bot.status === 'Active' ? '#D1FAE5' : '#FEE2E2', color: bot.status === 'Active' ? '#065F46' : '#B91C1C', padding: '3px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '700' }}>
                    {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>🌐 {bot.website_url}</div>
                {bot.calendly_link && <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>📅 {bot.calendly_link}</div>}
              </div>
              <button
                onClick={() => setEmbedBot(bot)}
                style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
              >
                &lt;/&gt; Get Embed Code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
