import { Inter } from "next/font/google";
import Chatbot from '@/components/Chatbot';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "BotFlow AI — Grow Your Business with AI Chatbots",
  description: "Create AI chatbots trained on your business data to capture leads and boost sales.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
