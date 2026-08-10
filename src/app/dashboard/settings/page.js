'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Settings, Save, CheckCircle, Palette, Bot, Upload, Image } from 'lucide-react';
import { motion } from 'framer-motion';

const EMOJI_AVATARS = ['🤖', '👩', '👨', '👩‍💼', '👨‍💼', '🦸‍♀️', '🦸‍♂️', '🧠', '💁‍♀️', '💁‍♂️', '🏡', '🔑', '🏢', '⭐', '💎'];

const PRESET_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#CA8A04', '#16A34A', '#0891B2',
  '#0EA5E9', '#64748B', '#111827', '#7C2D12',
];

export default function SettingsPage() {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [userId, setUserId] = useState(null);
  const [avatarMode, setAvatarMode] = useState('emoji'); // 'emoji' | 'image'
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef(null);

  // Bot fields editable
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [botAvatar, setBotAvatar] = useState('🤖');
  const [agentName, setAgentName] = useState('');
  const [welcomeMsg, setWelcomeMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const id = localStorage.getItem('impersonated_user_id') || session.user.id;
      setUserId(id);

      const { data: botData } = await supabase
        .from('bots')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (botData) {
        setBot(botData);
        setPrimaryColor(botData.primary_color || '#4F46E5');
        setAgentName(botData.name || '');
        setWelcomeMsg(botData.welcome_message || '');
        // Check if avatar is URL or emoji
        const av = botData.bot_avatar || '🤖';
        if (av.startsWith('http') || av.startsWith('/')) {
          setAvatarMode('image');
          setImagePreview(av);
          setBotAvatar(av);
        } else {
          setAvatarMode('emoji');
          setBotAvatar(av);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); return; }

    setUploadingImg(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setBotAvatar(reader.result);
      setAvatarMode('image');
      setUploadingImg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!bot) return;
    setSaving(true);
    setSuccessMsg('');

    const { error } = await supabase.from('bots').update({
      primary_color: primaryColor,
      bot_avatar: botAvatar,
      name: agentName,
      welcome_message: welcomeMsg,
    }).eq('id', bot.id);

    if (!error) {
      setSuccessMsg('✅ Changes saved! Your chatbot has been updated.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } else {
      setSuccessMsg('❌ Error saving: ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!bot) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
      <Bot size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
      <p>No chatbot found. Please create one from the <a href="/dashboard/chatbots" style={{ color: 'var(--primary)' }}>Chatbots</a> section.</p>
    </div>
  );

  // Live preview style
  const btnStyle = {
    background: primaryColor,
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '12px 22px',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: `0 4px 20px ${primaryColor}66`,
  };

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>⚙️ Chatbot Settings</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>Customize your chatbot's appearance and personality.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>

        {/* ── LEFT: Settings Panel ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Agent Name */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(99,102,241,0.12)', borderRadius: '10px', color: 'var(--primary)' }}>
                <Bot size={18} />
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Agent Info</h2>
            </div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Agent / Bot Name</label>
            <input
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="e.g. Sarah"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'rgba(255,255,255,0.04)', outline: 'none', boxSizing: 'border-box' }}
            />
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '16px' }}>Welcome Message</label>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              rows={3}
              placeholder="e.g. Hi there! 👋 How can I help you today?"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'rgba(255,255,255,0.04)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Bot Avatar */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(99,102,241,0.12)', borderRadius: '10px', color: 'var(--primary)' }}>
                <Image size={18} />
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Bot Avatar / Icon</h2>
            </div>

            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['emoji', 'image'].map(mode => (
                <button key={mode} onClick={() => setAvatarMode(mode)} style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
                  background: avatarMode === mode ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                  color: avatarMode === mode ? 'white' : 'var(--text-secondary)',
                }}>
                  {mode === 'emoji' ? '😊 Emoji' : '🖼️ Image'}
                </button>
              ))}
            </div>

            {avatarMode === 'emoji' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {EMOJI_AVATARS.map(em => (
                  <button key={em} onClick={() => { setBotAvatar(em); setImagePreview(null); }}
                    style={{
                      fontSize: '26px', padding: '10px', borderRadius: '12px', border: botAvatar === em ? `2px solid ${primaryColor}` : '2px solid transparent',
                      background: botAvatar === em ? `${primaryColor}22` : 'rgba(255,255,255,0.05)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {em}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: '14px', padding: '32px', textAlign: 'center', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.2s',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px', display: 'block' }} />
                  ) : (
                    <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  )}
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {uploadingImg ? 'Processing...' : 'Click to upload image'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>PNG, JPG up to 2MB</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
            )}
          </div>

          {/* Primary Color */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(99,102,241,0.12)', borderRadius: '10px', color: 'var(--primary)' }}>
                <Palette size={18} />
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Brand Color</h2>
            </div>

            {/* Preset swatches */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: '10px', background: c, border: primaryColor === c ? '3px solid white' : '3px solid transparent',
                    cursor: 'pointer', boxShadow: primaryColor === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s',
                  }} />
              ))}
            </div>

            {/* Custom color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none', padding: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Custom Color</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{primaryColor.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '16px', background: `linear-gradient(90deg, #818CF8, ${primaryColor})`,
            color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: `0 4px 20px ${primaryColor}55`, transition: 'all 0.2s',
          }}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '14px 18px', borderRadius: '12px', background: successMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${successMsg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: successMsg.startsWith('✅') ? '#10B981' : '#EF4444' }}>
              {successMsg}
            </motion.div>
          )}
        </div>

        {/* ── RIGHT: Live Preview ──────────────────────────────── */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</p>

            {/* Mini chat window */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
              {/* Header */}
              <div style={{ background: primaryColor, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden', flexShrink: 0 }}>
                  {imagePreview
                    ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : botAvatar
                  }
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{agentName || 'AI Assistant'}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>● Online</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ padding: '16px', minHeight: '120px', background: '#F9FAFB' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, overflow: 'hidden' }}>
                    {imagePreview
                      ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : botAvatar
                    }
                  </div>
                  <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', fontSize: '13px', color: '#111827', maxWidth: '80%', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {welcomeMsg || 'Hi there! 👋 How can I help you?'}
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', background: 'white', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', background: '#F3F4F6', fontSize: '12px', color: '#9CA3AF' }}>Type a message...</div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '14px' }}>↑</span>
                </div>
              </div>
            </div>

            {/* Floating button preview */}
            <p style={{ margin: '20px 0 10px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Floating Button</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={btnStyle}>
                <span style={{ fontSize: '18px' }}>
                  {imagePreview
                    ? <img src={imagePreview} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} />
                    : botAvatar
                  }
                </span>
                Chat with us
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
