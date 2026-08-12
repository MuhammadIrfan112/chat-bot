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
      bot = { id: botId, name: 'Real Estate Bot', bot_avatar: '🏡', primary_color: '#10B981', plan: 'premium', welcome_message: 'Hi there! 👋 Welcome to RealtyPropFlow. How can I assist you with your real estate journey today?' };
    } else if (botId === 'demo-ecommerce') {
      bot = { id: botId, name: 'NOVA Fashion', bot_avatar: '🛍️', primary_color: '#000000', plan: 'premium', welcome_message: 'Welcome to NOVA! How can I help you style today?' };
    } else {
      return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Bot not found</div>;
    }
  }

  // Determine plan from URL param, then bot's DB plan, then default to 'standard'
  // NOTE: demo-real-estate and demo-ecommerce always default to 'premium'
  const planFromUrl = resolvedSearchParams.plan || '';
  const botPlan = planFromUrl || bot.plan || (botId.startsWith('demo-') ? 'premium' : 'standard');

  const initialConfig = {
    botId: bot.id,
    botName: bot.name || 'RealtyPropFlow AI',
    botAvatar: bot.bot_avatar || '🤖',
    primaryColor: bot.primary_color || '#4F46E5',
    welcomeMessage: bot.welcome_message || 'Hi there! 👋 How can I help you today?',
    plan: botPlan,
    autoOpen: bot.auto_open || false
  };

  // Inject config into window so Chatbot.js can use it
  const scriptContent = `
    window.CHATBOT_CONFIG = ${JSON.stringify(initialConfig)};
  `;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent', backgroundColor: 'transparent' }}>
      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
      <Chatbot isDesktopEmbed={isDesktopEmbed} initialConfig={initialConfig} />
      
      {/* Force transparent background on all wrapper elements */}
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
      `}} />
    </div>
  );
}
