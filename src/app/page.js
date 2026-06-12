import Chatbot from '@/components/Chatbot';

export const metadata = {
  title: 'SocialMedia110 - Chatbot Demo',
  description: 'A hybrid AI chatbot demo for SocialMedia110',
};

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FFFDF9', color: '#12213B', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '24px 6%', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>SocialMedia<span style={{ color: '#FF7B2C' }}>110</span></h1>
        <nav style={{ display: 'flex', gap: '32px' }}>
          <span style={{ fontWeight: '600' }}>Services</span>
          <span style={{ fontWeight: '600' }}>Niches</span>
          <span style={{ fontWeight: '600' }}>Pricing</span>
        </nav>
      </header>
      <section style={{ padding: '120px 6%', maxWidth: '800px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFF3EB',
          border: '1px solid rgba(255,123,44,0.25)',
          color: '#FF7B2C',
          padding: '6px 16px',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '28px'
        }}>
          ✦ Demo Environment
        </div>
        <h2 style={{ fontSize: '64px', fontWeight: '900', lineHeight: 1.1, marginBottom: '24px' }}>
          Social Media That <span style={{ color: '#FF7B2C', position: 'relative' }}>Actually Works</span>
        </h2>
        <p style={{ fontSize: '20px', color: '#6B6560', marginBottom: '40px', lineHeight: 1.7 }}>
          This is a demonstration of the hybrid AI chatbot. Test it out using the floating button in the bottom right corner!
        </p>
        <button style={{ backgroundColor: '#FF7B2C', color: 'white', padding: '16px 32px', borderRadius: '50px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 6px 24px rgba(255,123,44,0.35)' }}>
          Get Started
        </button>
      </section>

      {/* The Chatbot Demo */}
      <Chatbot />
    </main>
  );
}
