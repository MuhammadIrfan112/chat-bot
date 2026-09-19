'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import {
  Settings,
  Bot,
  User,
  Palette,
  Upload,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  Code
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Luxury Gold', hex: '#C9A227' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Royal Emerald', hex: '#10B981' },
  { name: 'Purple Velvet', hex: '#8B5CF6' },
  { name: 'Crimson Rose', hex: '#F43F5E' },
  { name: 'Midnight Navy', hex: '#3B82F6' },
  { name: 'Sunset Amber', hex: '#F59E0B' },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bot Settings
  const [botId, setBotId] = useState(null);
  const [botName, setBotName] = useState('RealtyPropFlow AI');
  const [botColor, setBotColor] = useState('#C9A227');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! Looking to buy, sell, or rent a property in the area?');
  const [botAvatar, setBotAvatar] = useState(null);
  const [botAvatarUploading, setBotAvatarUploading] = useState(false);

  // Dashboard / Agent Profile Settings (Independent from Chatbot)
  const [dashboardAvatar, setDashboardAvatar] = useState(null);
  const [dashboardAvatarUploading, setDashboardAvatarUploading] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [brokerage, setBrokerage] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'chatbot' | 'embed'

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const isDemo = localStorage.getItem('isDemo') === 'true';

      if (isDemo) {
        setBotName('RealtyPropFlow Assistant');
        setBotColor('#C9A227');
        setAgentName('Demo Agent');
        setAgentEmail('demo@realtypropflow.com');
        setBrokerage('Realty Premier Brokerage');
        setDashboardAvatar(localStorage.getItem('dashboard_avatar') || null);
        setBotAvatar(localStorage.getItem('bot_avatar') || null);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = localStorage.getItem('impersonated_user_id') || session.user.id;
      setAgentEmail(session.user.email || '');

      // 1. Load Dashboard Avatar from user metadata or localStorage
      const dashAv = session.user.user_metadata?.dashboard_avatar || localStorage.getItem('dashboard_avatar');
      if (dashAv) setDashboardAvatar(dashAv);

      // 2. Load Bot settings from 'bots' table
      const { data: bots } = await supabase
        .from('bots')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (bots && bots.length > 0) {
        const b = bots[0];
        setBotId(b.id);
        if (b.name) setBotName(b.name);
        if (b.primary_color) setBotColor(b.primary_color);
        if (b.welcome_message) setWelcomeMessage(b.welcome_message);
        if (b.bot_avatar) setBotAvatar(b.bot_avatar);
      }

      // 3. Load Agent name & brokerage from users_subscription or metadata
      const { data: userSub } = await supabase
        .from('users_subscription')
        .select('name')
        .eq('user_id', userId)
        .limit(1);

      if (userSub && userSub.length > 0 && userSub[0].name) {
        setAgentName(userSub[0].name);
      } else {
        setAgentName(session.user.user_metadata?.full_name || '');
      }

    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload Chatbot Avatar
  const handleBotAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBotAvatarUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = localStorage.getItem('impersonated_user_id') || session?.user?.id || 'guest';
      const ext = file.name.split('.').pop();
      const path = `avatars/${uid}/chatbot_${Date.now()}.${ext}`;

      await supabase.storage.from('bot_avatars').upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('bot_avatars').getPublicUrl(path);

      setBotAvatar(publicUrl);
      localStorage.setItem('bot_avatar', publicUrl);

      if (botId) {
        await supabase.from('bots').update({ bot_avatar: publicUrl }).eq('id', botId);
      }
    } catch (err) {
      console.error('Bot avatar upload error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setBotAvatarUploading(false);
    }
  };

  // Upload Dashboard / Agent Profile Avatar
  const handleDashboardAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setDashboardAvatarUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = localStorage.getItem('impersonated_user_id') || session?.user?.id || 'guest';
      const ext = file.name.split('.').pop();
      const path = `avatars/${uid}/dashboard_profile_${Date.now()}.${ext}`;

      await supabase.storage.from('bot_avatars').upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('bot_avatars').getPublicUrl(path);

      setDashboardAvatar(publicUrl);
      localStorage.setItem('dashboard_avatar', publicUrl);

      // Save to Supabase auth user_metadata
      if (session) {
        await supabase.auth.updateUser({
          data: { dashboard_avatar: publicUrl }
        });
      }
    } catch (err) {
      console.error('Dashboard avatar upload error:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setDashboardAvatarUploading(false);
    }
  };

  // Save All Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = localStorage.getItem('impersonated_user_id') || session?.user?.id;

      // 1. Update bot
      if (botId) {
        await supabase.from('bots').update({
          name: botName,
          primary_color: botColor,
          welcome_message: welcomeMessage,
          bot_avatar: botAvatar
        }).eq('id', botId);
      }

      // 2. Update user name in users_subscription
      if (userId) {
        await supabase.from('users_subscription').update({
          name: agentName
        }).eq('user_id', userId);
      }

      // 3. Update dashboard avatar in user_metadata
      if (session && dashboardAvatar) {
        await supabase.auth.updateUser({
          data: {
            dashboard_avatar: dashboardAvatar,
            full_name: agentName
          }
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const embedCode = `<script\n  src="${typeof window !== 'undefined' ? window.location.origin : 'https://www.realtypropflow.com'}/widget.js"\n  data-bot-id="${botId || 'YOUR_BOT_ID'}"\n  async\n></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#C9A227', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: '1280px', margin: '0 auto', color: '#F8FAFC' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '46px', height: '46px', borderRadius: '12px', 
            background: 'linear-gradient(135deg, #C9A227, #E5C058)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(201,162,39,0.3)'
          }}>
            <Settings size={24} color="#0F172A" />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
              Settings & Customization
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8' }}>
              Manage separate images for Chatbot and Dashboard Profile, theme colors, and bot configuration
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '10px',
            background: saveSuccess ? '#10B981' : 'linear-gradient(135deg, #C9A227, #E5C058)',
            color: saveSuccess ? '#FFFFFF' : '#0F172A',
            fontWeight: '700', fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(201,162,39,0.3)', transition: 'all 0.2s'
          }}
        >
          {saveSuccess ? (
            <>
              <Check size={18} />
              Settings Saved!
            </>
          ) : (
            <>
              <Sparkles size={18} />
              {saving ? 'Saving...' : 'Save All Changes'}
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        {[
          { id: 'branding', label: 'Avatars & Appearance', icon: <Palette size={16} /> },
          { id: 'chatbot', label: 'Chatbot Behavior', icon: <Bot size={16} /> },
          { id: 'embed', label: 'Website Embed Code', icon: <Code size={16} /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: isActive ? 'rgba(201,162,39,0.15)' : 'transparent',
                color: isActive ? '#C9A227' : '#94A3B8'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Avatars & Appearance */}
      {activeTab === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* Left: Avatar Selection Boxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. CHATBOT AVATAR (Distinct) */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(236,72,153,0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                    🤖 Chatbot Avatar Image
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                    Appears inside the website chat widget next to bot replies
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '18px', padding: '16px', backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Image Preview */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '18px',
                  backgroundColor: botColor,
                  border: '2px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, boxShadow: `0 4px 20px ${botColor}40`
                }}>
                  {botAvatar ? (
                    <img src={botAvatar} alt="Bot Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Bot size={36} color="#FFFFFF" />
                  )}
                </div>

                {/* Upload Button */}
                <div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', borderRadius: '8px', backgroundColor: 'rgba(201,162,39,0.15)',
                    color: '#C9A227', border: '1px solid rgba(201,162,39,0.3)', fontSize: '13px',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                    <Upload size={15} />
                    {botAvatarUploading ? 'Uploading...' : 'Choose Chatbot Image'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBotAvatarUpload} />
                  </label>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748B' }}>
                    Recommended: Square PNG/JPG, minimum 200x200px.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. DASHBOARD / AGENT PROFILE AVATAR (Distinct) */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(14,165,233,0.15)', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                    👤 Dashboard & Realtor Profile Avatar
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                    Your personal agent photo displayed in the dashboard header and user menu
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '18px', padding: '16px', backgroundColor: '#0F172A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Image Preview */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '18px',
                  background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, color: 'white', fontWeight: '800', fontSize: '24px',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
                }}>
                  {dashboardAvatar ? (
                    <img src={dashboardAvatar} alt="Dashboard Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    agentName ? agentName.charAt(0).toUpperCase() : 'A'
                  )}
                </div>

                {/* Upload Button */}
                <div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '9px 16px', borderRadius: '8px', backgroundColor: 'rgba(14,165,233,0.15)',
                    color: '#38BDF8', border: '1px solid rgba(14,165,233,0.3)', fontSize: '13px',
                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s'
                  }}>
                    <Upload size={15} />
                    {dashboardAvatarUploading ? 'Uploading...' : 'Choose Dashboard Image'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDashboardAvatarUpload} />
                  </label>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748B' }}>
                    Your personal headshot or company agent photo.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. THEME COLOR PICKER */}
            <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Palette size={20} color="#C9A227" />
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                    Primary Theme Color
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>
                    Used for chatbot header, buttons, and visual highlights
                  </p>
                </div>
              </div>

              {/* Color Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {COLOR_PRESETS.map(preset => (
                  <button
                    type="button"
                    key={preset.hex}
                    onClick={() => setBotColor(preset.hex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                      borderRadius: '8px', backgroundColor: '#0F172A',
                      border: botColor === preset.hex ? `2px solid ${preset.hex}` : '1px solid rgba(255,255,255,0.08)',
                      color: '#F1F5F9', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: preset.hex }} />
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Custom Hex Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  value={botColor}
                  onChange={e => setBotColor(e.target.value)}
                  style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                />
                <input
                  type="text"
                  value={botColor}
                  onChange={e => setBotColor(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px',
                    fontFamily: 'monospace', width: '120px'
                  }}
                />
              </div>
            </div>

          </div>

          {/* Right: Live Preview Panel */}
          <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Eye size={18} color="#C9A227" />
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>Live Widget Preview</h3>
            </div>

            {/* Mock Chat Widget */}
            <div style={{
              borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
              {/* Chat Header */}
              <div style={{
                padding: '16px', backgroundColor: botColor,
                display: 'flex', alignItems: 'center', gap: '12px', color: '#FFFFFF'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                }}>
                  {botAvatar ? (
                    <img src={botAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Bot size={22} color="#FFFFFF" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{botName}</div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>🟢 Online • Real Estate AI</div>
                </div>
              </div>

              {/* Chat Body */}
              <div style={{ padding: '20px 16px', minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: botColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {botAvatar ? <img src={botAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Bot size={16} color="white" />}
                  </div>
                  <div style={{
                    backgroundColor: '#1E293B', padding: '12px 14px', borderRadius: '12px',
                    fontSize: '13px', color: '#F1F5F9', maxWidth: '85%', lineHeight: '1.4',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    {welcomeMessage}
                  </div>
                </div>

                {/* Client Response Simulation */}
                <div style={{ alignSelf: 'flex-end', backgroundColor: botColor, padding: '10px 14px', borderRadius: '12px', fontSize: '12px', color: '#FFFFFF', maxWidth: '80%' }}>
                  I'm looking for a 3-bedroom detached home.
                </div>
              </div>
            </div>

            {/* Dashboard Avatar Mini Preview */}
            <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Dashboard Profile Avatar:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #C9A227, #4F46E5)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  {dashboardAvatar ? <img src={dashboardAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (agentName ? agentName.charAt(0).toUpperCase() : 'A')}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>{agentName || 'Realtor Agent'}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Displayed in admin header</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: Chatbot Behavior */}
      {activeTab === 'chatbot' && (
        <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '28px', maxWidth: '780px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 18px', color: '#FFFFFF' }}>
            Chatbot Identity & Welcome Message
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                Chatbot Display Name
              </label>
              <input
                type="text"
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="e.g. RealtyPropFlow AI"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '8px', backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                Welcome Message (First Greeting)
              </label>
              <textarea
                rows={3}
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                placeholder="Welcome greeting for clients..."
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '8px', backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px', outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>
                Agent / Realtor Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. Irfan Gull"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: '8px', backgroundColor: '#0F172A',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Website Embed Code */}
      {activeTab === 'embed' && (
        <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', padding: '28px', maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Code size={20} color="#C9A227" />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
              Add Chatbot to Your Website
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 20px' }}>
            Paste this one-line script tag before the closing <code>&lt;/body&gt;</code> tag of your website. It works on WordPress, Wix, Webflow, Squarespace, and custom websites.
          </p>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <pre style={{
              backgroundColor: '#0F172A', padding: '18px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)', color: '#38BDF8', fontSize: '13px',
              fontFamily: 'monospace', overflowX: 'auto', margin: 0
            }}>
              {embedCode}
            </pre>

            <button
              onClick={copyEmbedCode}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '6px',
                backgroundColor: copied ? '#10B981' : 'rgba(255,255,255,0.1)',
                color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href={`/embed?bot_id=${botId || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '8px', backgroundColor: 'rgba(201,162,39,0.15)',
                color: '#C9A227', border: '1px solid rgba(201,162,39,0.3)', fontSize: '13px',
                fontWeight: '700', textDecoration: 'none'
              }}
            >
              <ExternalLink size={15} />
              Open Live Widget Tester
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
