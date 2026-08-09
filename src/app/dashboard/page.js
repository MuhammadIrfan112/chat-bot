'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#94A3B8',
  marginBottom: '6px',
};

const sectionStyle = {
  backgroundColor: 'rgba(255,255,255,0.03)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '28px',
  marginBottom: '24px',
};

const sectionTitleStyle = {
  fontSize: '15px',
  fontWeight: '800',
  color: 'white',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '16px',
};

function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const tags = value || [];

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={add} style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#4F46E5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}>
          + Add
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {tags.map(tag => (
          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(99,102,241,0.2)', color: '#A5B4FC', fontSize: '13px', fontWeight: '600' }}>
            {tag}
            <button type="button" onClick={() => remove(tag)} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [botId, setBotId] = useState(null);
  const [kbRecordId, setKbRecordId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [profile, setProfile] = useState({
    // 1. Agent Information
    full_name: '',
    title: '',
    brokerage: '',
    years_experience: '',
    phone: '',
    email: '',
    office_address: '',
    business_hours: '',
    booking_link: '',
    website_url: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    // 2. Specialties & Languages
    specialties: [],
    languages: [],
    // 3. Service Areas
    cities_served: [],
    neighborhoods: [],
    zip_codes: [],
    counties: [],
    communities: [],
    condo_buildings: [],
    // 4. Areas NOT served
    areas_not_served: [],
  });

  const setField = (key, val) => setProfile(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const uid = localStorage.getItem('impersonated_user_id') || session.user.id;
    setUserId(uid);

    // Get bot info
    const { data: bots } = await supabase.from('bots').select('id, name').eq('user_id', uid).limit(1);
    if (bots && bots.length > 0) {
      setBotId(bots[0].id);
      if (!profile.full_name) setField('full_name', bots[0].name || '');
    }

    // Get subscription info for email/phone pre-fill
    const { data: sub } = await supabase.from('users_subscription').select('name, email').eq('user_id', uid).single();

    // Load existing profile from knowledge_base
    const botIdToUse = bots?.[0]?.id;
    let existingProfile = null;
    if (botIdToUse) {
      const { data: kb } = await supabase
        .from('knowledge_base')
        .select('id, content')
        .eq('bot_id', botIdToUse)
        .eq('source', 'Agent Profile Data')
        .single();

      if (kb && kb.content) {
        try { existingProfile = JSON.parse(kb.content); setKbRecordId(kb.id); } catch {}
      }
    }

    // Merge: existing profile > subscription data > bot name
    setProfile(prev => ({
      ...prev,
      full_name: existingProfile?.full_name || bots?.[0]?.name || sub?.name || '',
      email: existingProfile?.email || sub?.email || session.user.email || '',
      ...(existingProfile || {}),
    }));
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    const uid = userId || session?.user?.id;

    // 1. Sync name to bots table
    if (botId && profile.full_name) {
      await supabase.from('bots').update({ name: profile.full_name }).eq('id', botId);
    }

    // 2. Save full profile to knowledge_base
    const profileJson = JSON.stringify(profile);
    if (kbRecordId) {
      await supabase.from('knowledge_base').update({ content: profileJson }).eq('id', kbRecordId);
    } else if (botId) {
      const { data: inserted } = await supabase.from('knowledge_base').insert({
        user_id: uid,
        bot_id: botId,
        content: profileJson,
        source: 'Agent Profile Data',
      }).select().single();
      if (inserted) setKbRecordId(inserted.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Loading your profile...
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>👤 My Agent Profile</h1>
          <p style={{ color: '#94A3B8', marginTop: '4px', fontSize: '14px' }}>
            Your AI chatbot will use this information to represent you accurately to clients.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '12px 28px', background: saved ? '#10B981' : 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1, transition: 'all 0.3s' }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
        </button>
      </div>

      <form onSubmit={handleSave}>

        {/* Section 1: Personal & Professional Info */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🏅 Personal & Professional Information</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Agent Full Name *</label>
              <input style={inputStyle} value={profile.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="e.g. Sarah Johnson" />
              <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>This updates the chatbot name automatically.</p>
            </div>
            <div>
              <label style={labelStyle}>Title / License</label>
              <input style={inputStyle} value={profile.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Realtor®, Broker, Sales Rep" />
            </div>
            <div>
              <label style={labelStyle}>Brokerage / Company</label>
              <input style={inputStyle} value={profile.brokerage} onChange={e => setField('brokerage', e.target.value)} placeholder="e.g. RE/MAX Professionals" />
            </div>
            <div>
              <label style={labelStyle}>Years of Experience</label>
              <input style={inputStyle} type="number" min="0" value={profile.years_experience} onChange={e => setField('years_experience', e.target.value)} placeholder="e.g. 12" />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={labelStyle}>Specialties (press Enter or click + Add)</label>
            <TagInput value={profile.specialties} onChange={v => setField('specialties', v)} placeholder="e.g. Luxury Homes, First-Time Buyers..." />
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={labelStyle}>Languages Spoken</label>
            <TagInput value={profile.languages} onChange={v => setField('languages', v)} placeholder="e.g. English, Spanish, Urdu..." />
          </div>
        </div>

        {/* Section 2: Contact & Links */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📞 Contact & Links</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input style={inputStyle} value={profile.phone} onChange={e => setField('phone', e.target.value)} placeholder="e.g. +1 416-555-0123" />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} type="email" value={profile.email} onChange={e => setField('email', e.target.value)} placeholder="your@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Office Address</label>
              <input style={inputStyle} value={profile.office_address} onChange={e => setField('office_address', e.target.value)} placeholder="123 Main St, Toronto, ON" />
            </div>
            <div>
              <label style={labelStyle}>Business Hours</label>
              <input style={inputStyle} value={profile.business_hours} onChange={e => setField('business_hours', e.target.value)} placeholder="e.g. Mon–Fri 9am–6pm, Sat 10am–4pm" />
            </div>
            <div>
              <label style={labelStyle}>Booking / Appointment Link</label>
              <input style={inputStyle} value={profile.booking_link} onChange={e => setField('booking_link', e.target.value)} placeholder="https://calendly.com/yourname" />
            </div>
            <div>
              <label style={labelStyle}>Website URL</label>
              <input style={inputStyle} value={profile.website_url} onChange={e => setField('website_url', e.target.value)} placeholder="https://yourwebsite.com" />
            </div>
          </div>

          <div style={{ ...gridStyle, marginTop: '16px' }}>
            <div>
              <label style={labelStyle}>Facebook URL</label>
              <input style={inputStyle} value={profile.facebook} onChange={e => setField('facebook', e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label style={labelStyle}>Instagram URL</label>
              <input style={inputStyle} value={profile.instagram} onChange={e => setField('instagram', e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label style={labelStyle}>LinkedIn URL</label>
              <input style={inputStyle} value={profile.linkedin} onChange={e => setField('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
        </div>

        {/* Section 3: Service Areas */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🗺️ Areas I Serve</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Cities / Towns</label>
              <TagInput value={profile.cities_served} onChange={v => setField('cities_served', v)} placeholder="e.g. Milton, Mississauga, Toronto..." />
            </div>
            <div>
              <label style={labelStyle}>Neighborhoods</label>
              <TagInput value={profile.neighborhoods} onChange={v => setField('neighborhoods', v)} placeholder="e.g. Scarborough Village, Lakeshore..." />
            </div>
            <div>
              <label style={labelStyle}>ZIP / Postal Codes</label>
              <TagInput value={profile.zip_codes} onChange={v => setField('zip_codes', v)} placeholder="e.g. L9T, M5V, 90210..." />
            </div>
            <div>
              <label style={labelStyle}>Counties</label>
              <TagInput value={profile.counties} onChange={v => setField('counties', v)} placeholder="e.g. Halton County, Peel Region..." />
            </div>
            <div>
              <label style={labelStyle}>Communities / Master-Planned Areas</label>
              <TagInput value={profile.communities} onChange={v => setField('communities', v)} placeholder="e.g. Bronte Creek, Hawthorne Village..." />
            </div>
            <div>
              <label style={labelStyle}>Condo Buildings / Complexes</label>
              <TagInput value={profile.condo_buildings} onChange={v => setField('condo_buildings', v)} placeholder="e.g. One Yonge, The Vue..." />
            </div>
          </div>
        </div>

        {/* Section 4: Areas NOT Served */}
        <div style={{ ...sectionStyle, borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ ...sectionTitleStyle, color: '#FCA5A5' }}>🚫 Areas I Do NOT Serve</div>
          <TagInput value={profile.areas_not_served} onChange={v => setField('areas_not_served', v)} placeholder="e.g. Vancouver, Calgary, Ottawa..." />
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
            The AI will politely redirect users asking about these areas to a trusted local partner.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '40px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '14px 36px', background: saved ? '#10B981' : 'linear-gradient(90deg, #818CF8, #4F46E5)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1 }}
          >
            {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
