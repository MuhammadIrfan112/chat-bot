'use client';
import Link from 'next/link';

export default function HowItWorks() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: 'sans-serif' }}>
      {/* Navbar */}
      <header style={{ padding: '20px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #FFFFFF, #EEF2FF)', borderBottom: '1px solid #E5E7EB', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ fontSize: '28px' }}>🚀</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>BotFlow AI</h1>
        </Link>
        <Link href="/" style={{ fontWeight: '600', color: '#4B5563', textDecoration: 'none' }}>Back to Home</Link>
      </header>

      {/* Main Content */}
      <main style={{ padding: '80px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#111827', marginBottom: '24px', letterSpacing: '-1.5px' }}>How <span style={{ color: '#4F46E5' }}>BotFlow AI</span> Works</h1>
          <p style={{ fontSize: '22px', color: '#6B7280', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
            A complete system designed to capture leads, answer questions, and grow your business on autopilot. Here is what happens after you sign up.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
          
          {/* Step 1 */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Step 1: Dashboard Access</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>Create Your Bot & Add Knowledge</h2>
              <p style={{ fontSize: '18px', color: '#6B7280', lineHeight: '1.6', marginBottom: '24px' }}>
                Once you sign up, you get access to your Admin Dashboard. Here you create your first chatbot. You paste your website link, customize the bot's colors and name, and upload your FAQs. The AI reads this data and instantly learns how to answer questions just like you.
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '100px' }}>🧠</div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#EEF2FF', padding: '40px', borderRadius: '24px', border: '1px solid #C7D2FE', boxShadow: '0 10px 30px rgba(79, 70, 229, 0.05)' }}>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '100px' }}>🌐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Step 2: Go Live</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>Embed on Your Website</h2>
              <p style={{ fontSize: '18px', color: '#6B7280', lineHeight: '1.6', marginBottom: '24px' }}>
                We generate a simple 1-line script code for you. Copy and paste it into your Shopify, WordPress, Wix, or custom website. The bot appears instantly and starts greeting your visitors 24/7.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#10B981', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Step 3: Watch the Magic</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>Capture Leads in Real-Time</h2>
              <p style={{ fontSize: '18px', color: '#6B7280', lineHeight: '1.6', marginBottom: '24px' }}>
                When visitors chat with the bot, the AI intelligently asks for their Name and Email. As soon as they provide it, they instantly appear in your <b>Leads CRM</b> inside the dashboard. You can track all leads and their contact status.
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '100px' }}>🎯</div>
          </div>

          {/* Step 4 */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', backgroundColor: '#FFFBEB', padding: '40px', borderRadius: '24px', border: '1px solid #FDE68A', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.05)' }}>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '100px' }}>👨‍💻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Step 4: Ultimate Control</div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>Live Human Takeover</h2>
              <p style={{ fontSize: '18px', color: '#6B7280', lineHeight: '1.6', marginBottom: '24px' }}>
                Don't want to leave everything to the AI? No problem. Monitor conversations live from your dashboard. If you see a high-ticket client, click the <b>Takeover</b> button and chat with them manually to close the deal!
              </p>
            </div>
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#111827', marginBottom: '24px' }}>Ready to automate your sales?</h2>
          <Link href="/login" style={{ display: 'inline-block', backgroundColor: '#4F46E5', color: 'white', padding: '18px 40px', borderRadius: '12px', fontSize: '18px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)' }}>
            Start Building for Free
          </Link>
        </div>
      </main>
    </div>
  );
}
