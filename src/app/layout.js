import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "BotFlow AI — Grow Your Business with AI Chatbots",
  description: "Train an AI chatbot on your website in 2 minutes. Capture leads, automate sales, and watch your business grow 24/7.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#F8F9FF' }}>
        {children}
      </body>
    </html>
  );
}
