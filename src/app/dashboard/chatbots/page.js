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
    cities: [],
    coverage_area: 'exclusive',
  });
  const [cityInput, setCityInput] = useState('');

  const avatarOptions = ['🤖', '👩', '👨', '👩‍💼', '👨‍💼', '🦸‍♀️', '🦸‍♂️', '🧠'];

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const id = localStorage.getItem('impersonated_user_id') || session.user.id;
    setUserId(id);
    fetchBots(id);
  }

  async function fetchBots(uid) {
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
        setForm({ name: '', industry: 'Real Estate', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖', target_city: '', coverage_area: 'exclusive' });
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
        // Generate Knowledge Base Profile for Real Estate Agents
        if (form.industry === 'Real Estate' && form.cities.length > 0) {
          const isExclusive = form.coverage_area === 'exclusive';
          const cityList = form.cities.join(', ');
          const kbContent = `[AGENT KNOWLEDGE PROFILE]
Agent Name: ${form.name}
Service Cities: ${cityList}
Coverage Policy: ${isExclusive
            ? `I exclusively sell and buy properties in these areas: ${cityList}. If a user asks for properties in any other city, state, or country NOT in this list, I must politely inform them that I specialize only in these areas and can refer them to a trusted local partner.`
            : `I primarily focus on ${cityList}, but I can also assist with properties in surrounding areas.`
          }
IMPORTANT: When a user asks about properties, always check if their requested city matches one of my service cities (${cityList}). If yes, show available data. If no, redirect them.`;

          await supabase.from('knowledge_base').insert({
            user_id: userId,
            bot_id: data.id,
            content: kbContent,
            source: 'Agent Onboarding Profile'
          });
        }

        // Trigger background auto-scraping to train the bot
        fetch('/api/bot/scrape-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: form.website_url, bot_id: data.id })
        }).catch(err => console.error("Auto-scrape failed:", err));

        setShowForm(false);
        setCreateError('');
        setForm({ name: '', industry: 'Real Estate', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖', cities: [], coverage_area: 'exclusive' });
        setCityInput('');
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Embed code copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      // Fallback for HTTP or older browsers
      let textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Embed code copied to clipboard!');
      } catch (err) {
        console.error('Fallback copy failed', err);
        alert('Failed to copy. Please copy the code manually.');
      }
      textArea.remove();
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>🤖 My Chatbots</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create and manage your AI chatbots. Get the embed code for your website.</p>
        </div>
        {bots.length === 0 && (
          <button
            onClick={() => { setEditingBotId(null); setForm({ name: '', industry: 'Real Estate', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖', cities: [], coverage_area: 'exclusive' }); setShowForm(true); }}
            className="btn-primary-glow"
            style={{ padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
          >
            + Create New Bot
          </button>
        )}
      </div>

      {/* Create Bot Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Sticky Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{editingBotId ? '✏️ Edit Chatbot' : '🚀 Create New Chatbot'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1 }}>✕</button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Chatbot Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="glass-input" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px' }} placeholder="e.g. Acme Support" />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Industry / Website Type</label>
                <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className="glass-input" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px' }}>
                  <option style={{ color: 'black' }} value="Real Estate">Real Estate</option>
                  <option style={{ color: 'black' }} value="E-Commerce">E-Commerce</option>
                  <option style={{ color: 'black' }} value="Other">Other</option>
                </select>
              </div>

              {form.industry === 'Real Estate' && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '12px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#34D399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>🏠 Agent Service Areas</div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Cities / Towns You Serve</label>
                    
                    {/* Chip display */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {form.cities.map((city, idx) => (
                        <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#34D399', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '600' }}>
                          {city}
                          <button type="button" onClick={() => setForm({ ...form, cities: form.cities.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>

                    {/* Input to add new city */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ',') && cityInput.trim()) {
                            e.preventDefault();
                            const newCity = cityInput.trim().replace(/,$/, '');
                            if (newCity && !form.cities.includes(newCity)) {
                              setForm({ ...form, cities: [...form.cities, newCity] });
                            }
                            setCityInput('');
                          }
                        }}
                        placeholder="Type city name, press Enter to add..."
                        className="glass-input"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newCity = cityInput.trim();
                          if (newCity && !form.cities.includes(newCity)) {
                            setForm({ ...form, cities: [...form.cities, newCity] });
                          }
                          setCityInput('');
                        }}
                        style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#34D399', fontWeight: '700', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                      >+ Add</button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>e.g. Milton, Halton, Burlington, Mississauga</div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Coverage Area Policy</label>
                    <select value={form.coverage_area} onChange={e => setForm({...form, coverage_area: e.target.value})} className="glass-input" style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}>
                      <option style={{ color: 'black' }} value="exclusive">I EXCLUSIVELY sell in listed cities (Refer others to partners)</option>
                      <option style={{ color: 'black' }} value="broad">I primarily sell here, but can assist nearby areas too</option>
                    </select>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>Target Website URL</label>
                <input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  required
                  placeholder="https://yourbusiness.com"
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '13px' }}>Calendly Link <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span></label>
                <input
                  value={form.calendly_link}
                  onChange={(e) => setForm({ ...form, calendly_link: e.target.value })}
                  placeholder="https://calendly.com/your-name/30min"
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', fontWeight: '500' }}>💡 Note: If you want the &quot;📅 Book a Free Call&quot; button to appear, you must provide your Calendly link.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '13px' }}>Welcome Message</label>
                <input
                  value={form.welcome_message}
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Hi! How can I help you today?"
                  className="glass-input"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '13px' }}>Choose Avatar Icon</label>
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
                          border: form.bot_avatar === icon ? '2px solid #818CF8' : '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: form.bot_avatar === icon ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)',
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
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px', color: 'var(--text-primary)', fontSize: '13px' }}>Primary Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      style={{ width: '48px', height: '42px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: '2px', backgroundColor: 'transparent' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500', backgroundColor: form.primary_color, color: 'white', padding: '6px 14px', borderRadius: '6px' }}>
                      Preview
                    </span>
                  </div>
                </div>
              </div>

              {createError && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{createError.replace('❌ ', '')}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="btn-primary-glow"
                style={{ padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: creating ? 0.7 : 1 }}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>🎉 Chatbot Created!</h2>
              <button onClick={() => setEmbedBot(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '15px' }}><strong style={{ color: 'var(--text-primary)' }}>Option 1: Do it yourself</strong><br/>Copy this code and paste it into your website&apos;s HTML (before the closing <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>&lt;/body&gt;</code> tag):</p>
            <pre style={{ backgroundColor: '#020617', border: '1px solid rgba(163,230,53,0.2)', color: '#A3E635', padding: '16px', borderRadius: '12px', fontSize: '13px', overflowX: 'auto', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {getEmbedCode(embedBot)}
            </pre>
            <button
              onClick={() => copyToClipboard(getEmbedCode(embedBot))}
              style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}
            >
              📋 Copy Embed Code
            </button>

            <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', textTransform: 'uppercase' }}>OR</div>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            {/* Premium Installation Upsell */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #312E81)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>⭐ Option 2: Let us do it for you</div>
                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0' }}>Professional Installation Service</h3>
                <p style={{ color: '#C7D2FE', fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.5' }}>Don&apos;t know how to code? We will install and deploy the chatbot on your website perfectly within 24 hours.</p>
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
                  <a href="https://mail.google.com/mail/?view=cm&fs=1&to=irfangull2288@gmail.com&su=Order%3A%20Professional%20Installation%20Service%20(%24100)&body=Hi%2C%20I%20would%20like%20to%20order%20the%20chatbot%20Professional%20Installation%20Service%20(%24100)." target="_blank" rel="noreferrer" style={{ display: 'block', backgroundColor: '#4F46E5', color: 'white', padding: '10px 16px', borderRadius: '50px', textDecoration: 'none', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)', cursor: 'pointer' }}>
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
        <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '2px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>No chatbots yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Create your first chatbot to start capturing leads automatically.</p>
          <button
            onClick={() => { setEditingBotId(null); setForm({ name: '', industry: 'Real Estate', website_url: '', calendly_link: '', welcome_message: 'Hi there! 👋 How can I help you today?', primary_color: '#4F46E5', bot_avatar: '🤖', cities: [], coverage_area: 'exclusive' }); setShowForm(true); }}
            className="btn-primary-glow"
            style={{ padding: '12px 28px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}
          >
            + Create First Chatbot
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {bots.map(bot => (
            <div key={bot.id} className="glass-card" style={{ padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{bot.name}</h3>
                  <span style={{ backgroundColor: bot.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: bot.status === 'Active' ? '#34D399' : '#F87171', padding: '3px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', border: `1px solid ${bot.status === 'Active' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                    {bot.status === 'Active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>🌐 {bot.website_url}</div>
                {bot.calendly_link && <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>📅 {bot.calendly_link}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingBotId(bot.id);
                    setForm({
                      name: bot.name,
                      industry: bot.industry || 'Real Estate',
                      website_url: bot.website_url,
                      calendly_link: bot.calendly_link || '',
                      welcome_message: bot.welcome_message || '',
                      primary_color: bot.primary_color || '#4F46E5',
                      bot_avatar: bot.bot_avatar || '🤖',
                      cities: [],
                      coverage_area: 'exclusive'
                    });
                    setShowForm(true);
                  }}
                  className="btn-secondary-glass"
                  style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setEmbedBot(bot)}
                  className="btn-primary-glow"
                  style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
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
