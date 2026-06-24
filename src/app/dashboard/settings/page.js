'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Settings, Save, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [websiteType, setWebsiteType] = useState('other');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setWebsiteType(session.user.user_metadata?.website_type || 'other');
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    await supabase.auth.updateUser({ data: { website_type: websiteType } });
    setSuccessMsg('Settings saved successfully! Your dashboard layout has been updated.');
    setSaving(false);
    
    // Hide message after 5 seconds
    setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  if (loading) {
    return <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
    </div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Workspace Settings</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>Configure your account and platform preferences.</p>
      
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: 'var(--primary)' }}>
            <Settings size={20} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>General Preferences</h2>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Industry / Website Type
          </label>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            This changes your dashboard layout and AI behavior to show metrics relevant to your business model. You can change this at any time.
          </p>
          <select
            value={websiteType}
            onChange={(e) => setWebsiteType(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '15px', color: 'white', backgroundColor: 'rgba(255,255,255,0.03)', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          >
            <option value="real-estate" style={{ color: 'black' }}>Real Estate (Properties & Buyers)</option>
            <option value="ecommerce" style={{ color: 'black' }}>E-Commerce (Products & Shopping)</option>
            <option value="other" style={{ color: 'black' }}>Other (Generic CRM)</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' }}
        >
          <Save size={18} />
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </button>

        {successMsg && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '14px', fontWeight: '500' }}>
            <CheckCircle size={18} />
            {successMsg}
          </motion.div>
        )}
      </div>
    </div>
  );
}
