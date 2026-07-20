// Dedicated layout for /bot/* pages (loaded inside iframes on client sites)
// IMPORTANT: Do NOT include <Chatbot /> here — the bot/[id]/page.js renders it directly.
// Including it in root layout would cause it to render on ALL pages, including the iframe,
// which results in the chat window appearing at the top of the screen.

export const metadata = {
  title: 'BotFlow AI — Chatbot',
};

export default function BotLayout({ children }) {
  return <>{children}</>;
}
