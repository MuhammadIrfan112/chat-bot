'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Chatbot from './Chatbot';
import { supabase } from '@/lib/supabaseClient';

// Renders <Chatbot /> on every page EXCEPT /bot/* (which are loaded inside iframes).
// This prevents the global chatbot from double-rendering inside the embed iframe.
export default function ConditionalChatbot() {
  const pathname = usePathname();
  const [clientConfig, setClientConfig] = useState(null);

  useEffect(() => {
    // Only try to load the client's custom bot on dashboard pages
    if (pathname?.startsWith('/dashboard')) {
      const fetchClientBot = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: bots } = await supabase.from('bots').select('*').eq('user_id', session.user.id);
          if (bots && bots.length > 0) {
            const bot = bots[0];
            setClientConfig({
              botId: bot.id,
              botName: bot.name || 'AI Assistant',
              botAvatar: bot.bot_avatar || '🤖',
              primaryColor: bot.primary_color || '#4F46E5',
              welcomeMessage: bot.welcome_message || 'Hello! How can I help you?',
              plan: bot.plan || 'premium'
            });
          }
        }
      };
      fetchClientBot();
    }
  }, [pathname]);

  // Don't render chatbot on bot embed pages, superadmin, login, or dashboard
  if (pathname?.startsWith('/bot/')) return null;
  if (pathname?.startsWith('/superadmin')) return null;
  if (pathname?.startsWith('/login')) return null;
  if (pathname?.startsWith('/dashboard')) return null;

  return <Chatbot isGlobal={true} initialConfig={clientConfig} key={clientConfig ? clientConfig.botId : 'global'} />;
}
