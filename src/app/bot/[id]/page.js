import { supabase } from '@/lib/supabaseClient';
import Chatbot from '@/components/Chatbot';

export const dynamic = 'force-dynamic';

export default async function BotEmbedPage({ params, searchParams }) {
  // Await params as required by newer Next.js versions
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const botId = resolvedParams.id;
  const isDesktopEmbed = resolvedSearchParams.desktop === 'true';
  
  // Fetch bot config from database
  const { data } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single();
    
  let bot = data;

  if (!bot) {
    if (botId === 'demo-real-estate') {
      bot = { id: botId, name: 'Real Estate Fake Demo', bot_avatar: '🏡', primary_color: '#10B981', plan: 'premium', welcome_message: 'Hi there! 👋 Welcome to RealtyPropFlow. How can I assist you with your real estate journey today?' };
    } else if (botId === 'demo-real-estate-live') {
      bot = { id: botId, name: 'Real Estate Live Demo', bot_avatar: '🏢', primary_color: '#10B981', plan: 'premium', welcome_message: 'Hi there! 👋 Welcome to RealtyPropFlow Live. How can I assist you with your real estate journey today?' };
    } else {
      return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Bot not found</div>;
    }
  }

  const planFromUrl = resolvedSearchParams.plan || '';
  const autoOpenFromUrl = resolvedSearchParams.autoOpen === 'true';
  const botPlan = planFromUrl || bot.plan || (botId.startsWith('demo-') ? 'premium' : 'standard');

  const initialConfig = {
    botId: bot.id,
    botName: bot.name || 'RealtyPropFlow AI',
    botAvatar: bot.bot_avatar || '🤖',
    primaryColor: bot.primary_color || '#4F46E5',
    welcomeMessage: bot.welcome_message || 'Hi there! 👋 How can I help you today?',
    plan: botPlan,
    autoOpen: autoOpenFromUrl || bot.auto_open || false
  };

  // Inject config into window so Chatbot.js can use it
  const scriptContent = `
    window.CHATBOT_CONFIG = ${JSON.stringify(initialConfig)};
  `;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent', backgroundColor: 'transparent' }}>
      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
      <Chatbot isDesktopEmbed={isDesktopEmbed} initialConfig={initialConfig} />
      
      {/* Force transparent background and seamless button alignment inside iframe */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide the global chatbot (from root layout) if it accidentally renders inside iframe */
        #realty-prop-global-bot { display: none !important; }
        
        html, body, #__next, [data-nextjs-scroll-focus-boundary] {
          background: transparent !important;
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          height: 100% !important;
          width: 100% !important;
          overflow: hidden !important;
          color-scheme: light !important;
        }

        #realty-prop-embed-bot {
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: flex-end !important;
          justify-content: flex-end !important;
        }

        #realty-prop-embed-bot [class*="floatingBtn"] {
          position: relative !important;
          bottom: auto !important;
          right: auto !important;
          left: auto !important;
          top: auto !important;
          margin: 0 !important;
        }

        #realty-prop-embed-bot [class*="chatWindow"] {
          position: fixed !important;
          bottom: 0 !important;
          right: 0 !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          border-radius: 22px !important;
        }
      `}} />
    </div>
  );
}
