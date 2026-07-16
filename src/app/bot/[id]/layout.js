export const metadata = {
  title: 'RealtyPropFlow AI Chatbot',
};

export default function BotLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            background: transparent !important;
            background-color: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            width: 100%;
            height: 100%;
          }
        `}</style>
      </head>
      <body style={{ background: 'transparent', backgroundColor: 'transparent', margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
