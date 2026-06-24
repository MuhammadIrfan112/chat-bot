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
  const [editingBotId, setEditingBotId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    industry: 'Real Estate',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.website_url.trim()) return;
    setCreating(true);
    setCreateError('');

    if (editingBotId) {
      // UPDATE EXISTING BOT
      const { data, error } = await supabase.from('bots').update({
        name: form.name,
        website_url: form.website_url,
        calendly_link: form.calendly_link,
        welcome_message: form.welcome_message,
        primary_color: form.primary_color,
        bot_avatar: form.bot_avatar,
      }).eq('id', editingBotId).select().single();

      if (error) {
        setCreateError('❌ Error: ' + error.message);
        setCreating(false);
        return;
      }

      if (data) {
        setShowForm(false);
        setEditingBotId(null);
        setCreateError('');
        setForm({ name: '', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖' });
        fetchBots(userId);
      }
      setCreating(false);
    } else {
      // CREATE NEW BOT
      if (bots.length >= 1) {
        setCreateError('You have reached the maximum limit of 1 chatbot for your account.');
        setCreating(false);
        return;
      }

      // ✅ DOMAIN ABUSE CHECK
      try {
        const res = await fetch('/api/bot/check-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl: form.website_url })
        });
        const checkData = await res.json();
        
        if (checkData.exists) {
          setCreateError('❌ This website domain is already registered on our platform. You cannot create multiple accounts for the same website to abuse the free trial.');
          setCreating(false);
          return;
        }
      } catch (e) {
        setCreateError('❌ Failed to verify website domain. Please try again.');
        setCreating(false);
        return;
      }

      const { data, error } = await supabase.from('bots').insert({
        user_id: userId,
        name: form.name,
        industry: form.industry,
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
        // Trigger background auto-scraping to train the bot
        fetch('/api/bot/scrape-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: form.website_url, bot_id: data.id })
        }).catch(err => console.error("Auto-scrape failed:", err));

        setShowForm(false);
        setCreateError('');
        setForm({ name: '', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖' });
        fetchBots(userId);
        setEmbedBot(data);
      }
      setCreating(false);
    }
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
            onClick={() => { setEditingBotId(null); setForm({ name: '', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖' }); setShowForm(true); }}
            style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
          >
            + Create New Bot
          </button>
        )}
      </div>

      {/* Create Bot Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            {/* Sticky Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>{editingBotId ? '✏️ Edit Chatbot' : '🚀 Create New Chatbot'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>✕</button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Chatbot Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }} placeholder="e.g. Acme Support" />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Industry / Website Type</label>
                <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                  <option value="Real Estate">Real Estate</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Target Website URL</label>
                <input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  required
                  placeholder="https://yourbusiness.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#374151', fontSize: '13px' }}>Calendly Link <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</span></label>
                <input
                  value={form.calendly_link}
                  onChange={(e) => setForm({ ...form, calendly_link: e.target.value })}
                  placeholder="https://calendly.com/your-name/30min"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', fontWeight: '500' }}>💡 Note: If you want the "📅 Book a Free Call" button to appear in your chatbot, you must provide your Calendly link here.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#374151', fontSize: '13px' }}>Welcome Message</label>
                <input
                  value={form.welcome_message}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Hi! How can I help you today?"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#374151', fontSize: '13px' }}>Choose Avatar Icon</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {avatarOptions.map((icon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm({ ...form, bot_avatar: icon })}
                        style={{
                          width: '36px',
                          height: '36px',
                          fontSize: '20px',
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
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: '#374151', fontSize: '13px' }}>Primary Color</label>
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
                <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{createError.replace('❌ ', '')}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: creating ? 0.7 : 1 }}
              >
                {creating ? 'Saving...' : (editingBotId ? '💾 Update Chatbot' : '🚀 Create Chatbot')}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {embedBot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '700px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>🎉 Chatbot Created!</h2>
              <button onClick={() => setEmbedBot(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            
            <p style={{ color: '#4B5563', marginBottom: '16px', fontSize: '15px' }}><strong>Option 1: Do it yourself</strong><br/>Copy this code and paste it into your website's HTML (before the closing <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>&lt;/body&gt;</code> tag):</p>
            <pre style={{ backgroundColor: '#1E293B', color: '#A3E635', padding: '16px', borderRadius: '12px', fontSize: '13px', overflowX: 'auto', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {getEmbedCode(embedBot)}
            </pre>
            <button
              onClick={() => copyToClipboard(getEmbedCode(embedBot))}
              style={{ marginTop: '12px', width: '100%', padding: '12px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
            >
              📋 Copy Embed Code
            </button>

            <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
              <div style={{ color: '#9CA3AF', fontWeight: '600', fontSize: '14px', textTransform: 'uppercase' }}>OR</div>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
            </div>

            {/* Premium Installation Upsell */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>⭐ Option 2: Let us do it for you</div>
                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0' }}>Professional Installation Service</h3>
                <p style={{ color: '#C7D2FE', fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.5' }}>Don't know how to code? We will install and deploy the chatbot on your website perfectly within 24 hours.</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#A5B4FC', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>✅ Zero Tech Skills Needed</span>
                  <span style={{ color: '#A5B4FC', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>✅ Fully Tested</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', minWidth: '160px' }}>
                <div style={{ fontSize: '36px', fontWeight: '900', color: 'white', lineHeight: '1' }}>$100</div>
                <div style={{ color: '#A5B4FC', fontSize: '12px', marginBottom: '12px', marginTop: '4px' }}>One-time fee</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a href="https://wa.me/923000000000?text=Hi! I want the Professional Installation Service ($100) for my chatbot." target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#25D366', color: 'white', padding: '10px 16px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)' }}>
                    💬 WhatsApp
                  </a>
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=irfangull2288@gmail.com&su=Order%3A%20Professional%20Installation%20Service%20(%24100)&body=Hi%2C%20I%20would%20like%20to%20order%20the%20chatbot%20Professional%20Installation%20Service%20(%24100).%0A%0APlease%20find%20my%20details%20below%3A%0A%0A1.%20My%20Website%20URL%3A%20%5BEnter%20your%20website%20link%5D%0A2.%20Website%20Platform%3A%20%5Be.g.%2C%20WordPress%2C%20Shopify%2C%20Wix%5D%0A%0A---%20Installation%20Access%20(Provide%20One)%20---%0AOption%20A%3A%20Website%20Admin%20Login%20(Temporary)%0AUsername%3A%20%5BEnter%20username%5D%0APassword%3A%20%5BEnter%20password%5D%0A%0AOption%20B%3A%20Google%20Tag%20Manager%0AI%20have%20invited%20irfangull2288%40gmail.com%20to%20my%20GTM.%0A%0AHow%20should%20I%20proceed%20with%20the%20payment%3F" target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#4F46E5', color: 'white', padding: '10px 16px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)', cursor: 'pointer' }}>
                    📧 Email Us
                  </a>
                </div>
              </div>
            </div>

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
            onClick={() => { setEditingBotId(null); setForm({ name: '', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖' }); setShowForm(true); }}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingBotId(bot.id);
                    setForm({
                      name: bot.name,
                      website_url: bot.website_url,
                      calendly_link: bot.calendly_link || '',
                      welcome_message: bot.welcome_message || '',
                      primary_color: bot.primary_color || '#4F46E5',
                      bot_avatar: bot.bot_avatar || '🤖'
                    });
                    setShowForm(true);
                  }}
                  style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setEmbedBot(bot)}
                  style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                >
                  &lt;/&gt; Get Embed Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
