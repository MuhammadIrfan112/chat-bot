'use client';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navbar */}
      <header style={{ padding: '20px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(229, 231, 235, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '32px' }}>🚀</div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>BotSaaS</h1>
        </div>
        <nav style={{ display: 'flex', gap: '36px', fontWeight: '600', color: '#4B5563', fontSize: '15px' }}>
          <Link href="#how-it-works" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}>How it Works</Link>
          <Link href="#features" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}>Features</Link>
          <Link href="#pricing" style={{ textDecoration: 'none', color: 'inherit', transition: 'color 0.2s' }}>Pricing</Link>
        </nav>
        <Link href="/login" style={{ backgroundColor: '#111827', color: 'white', padding: '12px 28px', borderRadius: '50px', fontWeight: '600', textDecoration: 'none', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          Dashboard Login
        </Link>
      </header>

      {/* Hero Section */}
      <main style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '8px 20px', borderRadius: '50px', fontSize: '14px', fontWeight: '700', marginBottom: '32px', boxShadow: '0 2px 10px rgba(79, 70, 229, 0.15)' }}>
          <span style={{ position: 'relative', display: 'flex', height: '10px', width: '10px' }}>
            <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: '#4F46E5', opacity: 0.7 }}></span>
            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '10px', width: '10px', backgroundColor: '#4F46E5' }}></span>
          </span>
          The Future of Customer Support is Here
        </div>
        
        <h2 style={{ fontSize: '72px', fontWeight: '900', color: '#111827', lineHeight: '1.05', marginBottom: '28px', letterSpacing: '-2.5px' }}>
          Automate Your Sales with <br />
          <span style={{ background: 'linear-gradient(to right, #4F46E5, #9333EA)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Smart AI Chatbots</span>
        </h2>
        
        <p style={{ fontSize: '22px', color: '#4B5563', maxWidth: '650px', margin: '0 auto', marginBottom: '48px', lineHeight: '1.6' }}>
          Stop losing leads while you sleep. Train an AI agent on your business data in exactly 2 minutes and watch it convert visitors into paying customers 24/7.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <Link href="/login" style={{ backgroundColor: '#4F46E5', color: 'white', padding: '18px 40px', borderRadius: '12px', fontSize: '18px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)', transition: 'all 0.2s' }}>
            Start Building for Free
          </Link>
          <Link href="#demo" style={{ backgroundColor: '#FFFFFF', color: '#111827', padding: '18px 40px', borderRadius: '12px', fontSize: '18px', fontWeight: '700', textDecoration: 'none', border: '2px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            Book a Demo
          </Link>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" style={{ marginTop: '140px', paddingTop: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px', letterSpacing: '-1px' }}>Launch in 3 Simple Steps</h2>
          <p style={{ fontSize: '18px', color: '#6B7280', marginBottom: '56px' }}>No coding required. It's as simple as copying a link.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', textAlign: 'left', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ flex: 1, padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '100px', opacity: 0.03, fontWeight: '900' }}>1</div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', color: '#4F46E5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>1</div>
              <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#111827' }}>Create Your Bot</h4>
              <p style={{ color: '#6B7280', lineHeight: '1.6' }}>Sign up, enter your Website URL and Calendly link. Customize your bot's colors and name to match your brand perfectly.</p>
            </div>
            
            <div style={{ flex: 1, padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '100px', opacity: 0.03, fontWeight: '900' }}>2</div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', color: '#4F46E5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>2</div>
              <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#111827' }}>Add Knowledge</h4>
              <p style={{ color: '#6B7280', lineHeight: '1.6' }}>Paste your business FAQs, pricing, and rules into the AI Brain. The bot instantly learns everything about your company.</p>
            </div>
            
            <div style={{ flex: 1, padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E5E7EB', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', fontSize: '100px', opacity: 0.03, fontWeight: '900' }}>3</div>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#EEF2FF', color: '#4F46E5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>3</div>
              <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: '#111827' }}>Copy & Paste</h4>
              <p style={{ color: '#6B7280', lineHeight: '1.6' }}>Grab the generated 1-line script code from your dashboard and paste it into your website. Your bot is now live!</p>
            </div>
          </div>
        </div>

        {/* Dashboard Features Section */}
        <div id="features" style={{ marginTop: '140px', paddingTop: '60px', textAlign: 'left', backgroundColor: '#111827', borderRadius: '40px', padding: '80px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, rgba(17,24,39,0) 70%)' }}></div>
          
          <div style={{ maxWidth: '600px', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: '900', marginBottom: '20px', letterSpacing: '-1px' }}>Everything You Need in One Dashboard</h2>
            <p style={{ fontSize: '18px', color: '#9CA3AF', lineHeight: '1.6' }}>After you install the bot, log into your powerful admin dashboard to track performance, manage leads, and jump into conversations.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px' }}>
            {/* Feature 1 */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ fontSize: '40px' }}>🎯</div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>CRM Lead Capture</h3>
                <p style={{ color: '#9CA3AF', lineHeight: '1.6' }}>The AI automatically asks for Names and Emails from interested visitors and saves them directly to your Leads CRM table.</p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ fontSize: '40px' }}>💬</div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Live Chat Takeover</h3>
                <p style={{ color: '#9CA3AF', lineHeight: '1.6' }}>Monitor all bot conversations in real-time. See a hot prospect? Click "Takeover" and chat with them manually from the dashboard.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ fontSize: '40px' }}>📊</div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Analytics Dashboard</h3>
                <p style={{ color: '#9CA3AF', lineHeight: '1.6' }}>Track exactly how many chats were started, how many leads were captured, and measure your bot's conversion rate.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ fontSize: '40px' }}>🧠</div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Dynamic Knowledge Base</h3>
                <p style={{ color: '#9CA3AF', lineHeight: '1.6' }}>Update your AI's brain anytime. Just paste new text into the Knowledge section and the bot instantly learns your new rules.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" style={{ marginTop: '140px', marginBottom: '80px', paddingTop: '60px' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '16px', letterSpacing: '-1px' }}>Simple, Transparent Pricing</h2>
          <p style={{ fontSize: '20px', color: '#6B7280', marginBottom: '60px' }}>Choose the plan that fits your business. Save more with longer commitments!</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'left' }}>
            
            {/* Monthly */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px 32px', borderRadius: '24px', border: '1px solid #E5E7EB', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>Monthly</h3>
              <div style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '24px', letterSpacing: '-2px' }}>$25<span style={{ fontSize: '18px', fontWeight: '500', color: '#6B7280', letterSpacing: '0' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: '#4B5563', lineHeight: '2.2', flex: 1 }}>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> 1 Custom AI Chatbot</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Unlimited Knowledge</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Unlimited Leads</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Live Chat Takeover</li>
              </ul>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: '#F3F4F6', color: '#111827', padding: '16px', borderRadius: '12px', fontWeight: '700', textDecoration: 'none', transition: 'background 0.2s' }}>Get Started</Link>
            </div>

            {/* 3 Months */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px 32px', borderRadius: '24px', border: '2px solid #4F46E5', position: 'relative', boxShadow: '0 20px 40px rgba(79, 70, 229, 0.1)', display: 'flex', flexDirection: 'column', transform: 'scale(1.05)', zIndex: 10 }}>
              <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#4F46E5', color: 'white', padding: '6px 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '800', letterSpacing: '1px' }}>10% OFF</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>3 Months</h3>
              <div style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '24px', letterSpacing: '-2px' }}>$67.5<span style={{ fontSize: '18px', fontWeight: '500', color: '#6B7280', letterSpacing: '0' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: '#4B5563', lineHeight: '2.2', flex: 1 }}>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Everything in Monthly</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Billed every 3 months</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>🔥</span> Just $22.50 / month</li>
              </ul>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: '#4F46E5', color: 'white', padding: '16px', borderRadius: '12px', fontWeight: '700', textDecoration: 'none', transition: 'background 0.2s' }}>Get Started</Link>
            </div>

            {/* 6 Months */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px 32px', borderRadius: '24px', border: '1px solid #E5E7EB', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10B981', color: 'white', padding: '4px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>15% OFF</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>6 Months</h3>
              <div style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '24px', letterSpacing: '-2px' }}>$127.5<span style={{ fontSize: '18px', fontWeight: '500', color: '#6B7280', letterSpacing: '0' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: '#4B5563', lineHeight: '2.2', flex: 1 }}>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Everything in Monthly</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Billed every 6 months</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>🔥</span> Just $21.25 / month</li>
              </ul>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: '#F3F4F6', color: '#111827', padding: '16px', borderRadius: '12px', fontWeight: '700', textDecoration: 'none' }}>Get Started</Link>
            </div>

            {/* 12 Months */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px 32px', borderRadius: '24px', border: '1px solid #E5E7EB', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#F59E0B', color: 'white', padding: '4px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>25% OFF</div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>12 Months</h3>
              <div style={{ fontSize: '48px', fontWeight: '900', color: '#111827', marginBottom: '24px', letterSpacing: '-2px' }}>$225<span style={{ fontSize: '18px', fontWeight: '500', color: '#6B7280', letterSpacing: '0' }}>/total</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', color: '#4B5563', lineHeight: '2.2', flex: 1 }}>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Everything in Monthly</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>✅</span> Billed yearly</li>
                <li style={{ display: 'flex', gap: '10px' }}><span>🔥</span> Just $18.75 / month</li>
              </ul>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: '#F3F4F6', color: '#111827', padding: '16px', borderRadius: '12px', fontWeight: '700', textDecoration: 'none' }}>Get Started</Link>
            </div>

          </div>
        </div>
      </main>

      {/* The Chatbot */}
      <Chatbot />
    </div>
  );
}
