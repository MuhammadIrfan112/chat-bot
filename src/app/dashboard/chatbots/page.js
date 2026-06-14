'use client';

export default function ChatbotsPage() {
  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>🤖 My Chatbots</h1>
      <p style={{ color: '#6B7280', marginBottom: '32px' }}>Manage your deployed chatbots and their configurations.</p>
      
      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', border: '1px solid #E5E7EB', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Coming Soon</h2>
        <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
          This section will allow you to create multiple chatbots for different websites, customize their branding colors, and setup unique welcome messages. Currently in development!
        </p>
      </div>
    </div>
  );
}
