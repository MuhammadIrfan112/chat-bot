import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const scriptContent = `
(function() {
  if (window.RealtyPropFlow_INITIALIZED) return;
  window.RealtyPropFlow_INITIALIZED = true;

  var config = window.CHATBOT_CONFIG || {};
  if (!config.botId) {
    console.error('RealtyPropFlow AI: Missing botId in CHATBOT_CONFIG');
    return;
  }

  // Find the baseUrl from the script tag
  var scripts = document.getElementsByTagName('script');
  var baseUrl = '';
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('/api/embed')) {
      var urlObj = new URL(scripts[i].src);
      baseUrl = urlObj.origin;
      break;
    }
  }

  if (!baseUrl) {
    baseUrl = 'https://chatbot-flow.vercel.app';
  }

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'RealtyPropFlow-chatbot-iframe';
  
  var isMobile = window.innerWidth <= 768;
  var isTablet = false;
  iframe.src = baseUrl + '/bot/' + config.botId + (isMobile ? '?device=mobile' : '?desktop=true');
  
  // Closed: desktop pill button area | mobile: circular button area
  var closedStyle = isMobile
    ? "position: fixed; bottom: 16px; right: 16px; width: 80px; height: 80px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;"
    : "position: fixed; bottom: 0; right: 0; width: 220px; height: 90px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";

  var openStyle = "position: fixed; bottom: 0; right: 0; width: 420px; height: 550px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";
  
  if (isMobile) {
    openStyle = "position: fixed; bottom: 0; right: 0; width: 100vw; height: 100vh; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light;";
  } else if (isTablet) {
    openStyle = "position: fixed; bottom: 0; right: 0; width: 400px; height: 580px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";
  }

  iframe.style.cssText = closedStyle;
  iframe.allowTransparency = "true";
  
  document.body.appendChild(iframe);

  window.addEventListener('message', function(event) {
    if (event.origin !== baseUrl) return;
    
    if (event.data && event.data.type === 'CHATBOT_TOGGLE') {
      if (event.data.isOpen) {
        iframe.style.cssText = openStyle;
      } else {
        iframe.style.cssText = closedStyle;
      }
    }
  });

})();
  `;

  return new NextResponse(scriptContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

