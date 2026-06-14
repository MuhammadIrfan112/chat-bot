'use client';

export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>⚙️ Settings</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Configure your account and platform preferences.</p>
      
      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', border: '1px solid #E5E7EB', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Settings Under Construction</h2>
        <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
          Here you will be able to manage your profile, update billing details, and setup external integrations (like WhatsApp or Zapier). Stay tuned!
        </p>
      </div>
    </div>
  );
}
