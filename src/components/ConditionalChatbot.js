'use client';
import { usePathname } from 'next/navigation';
import Chatbot from './Chatbot';

// Renders <Chatbot /> on every page EXCEPT /bot/* (which are loaded inside iframes).
// This prevents the global chatbot from double-rendering inside the embed iframe.
export default function ConditionalChatbot() {
  const pathname = usePathname();
  if (pathname?.startsWith('/bot/')) return null;
  return <Chatbot />;
}
