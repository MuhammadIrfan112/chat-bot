import { supabase } from '@/lib/supabaseClient';
import Chatbot from '@/components/Chatbot';

export default async function BotEmbedPage({ params }) {
  // Await params as required by newer Next.js versions
  const resolvedParams = await params;
  const botId = resolvedParams.id;
  
  // Fetch bot config from database
  const { data: bot } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single();

  if (!bot) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Bot not found</div>;
  }

  // Inject config into window so Chatbot.js can use it
  const scriptContent = `
    window.CHATBOT_CONFIG = {
      botId: "${bot.id}",
      botName: "${bot.name || 'BotFlow AI'}",
      botAvatar: "${bot.bot_avatar || '🤖'}",
      primaryColor: "${bot.primary_color || '#4F46E5'}",
      welcomeMessage: "${bot.welcome_message || 'Hi there! 👋 How can I help you today?'}"
    };
  `;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent', backgroundColor: 'transparent' }}>
      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
      <Chatbot />
      
      {/* Force transparent background on all wrapper elements */}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #__next, [data-nextjs-scroll-focus-boundary] {
          background: transparent !important;
          background-color: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .chatbotContainer {
          bottom: 0 !important;
          right: 0 !important;
          position: fixed !important;
          width: auto !important;
          height: auto !important;
        }
      `}} />
    </div>
  );
}
