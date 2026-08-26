import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const scriptContent = `
(function() {
  var config = window.CHATBOT_CONFIG || {};
  var position = config.position === 'left' ? 'left' : 'right';
  var initFlag = 'RealtyPropFlow_INITIALIZED_' + position;

  if (window[initFlag]) return;
  window[initFlag] = true;

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
    baseUrl = 'https://www.realtypropflow.com';
  }

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.id = 'RealtyPropFlow-chatbot-iframe-' + position;
  
  var isMobile = window.innerWidth <= 768;
  var isTablet = false;
  var timestamp = new Date().getTime();
  var planParams = config.plan ? '&plan=' + encodeURIComponent(config.plan) : '';
  var iframeUrl = baseUrl + '/bot/' + config.botId + '?position=' + position + (isMobile ? '&device=mobile' : '&desktop=true') + planParams + '&v=' + timestamp;
  iframe.src = iframeUrl;
  
  // Closed: desktop pill button area | mobile: circular button area
  var closedStyle = isMobile
    ? "position: fixed; bottom: 16px; " + position + ": 16px; width: 80px; height: 80px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;"
    : "position: fixed; bottom: 16px; " + position + ": 16px; width: 200px; height: 68px; border: none; border-radius: 50px; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";

  // Open: desktop floating card with rounded corners, tablet same
  var openStyle = "position: fixed; bottom: 20px; " + position + ": 16px; width: 420px; height: 600px; border: none; border-radius: 22px; overflow: hidden; z-index: 2147483647; background: transparent; pointer-events: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.22); transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";
  
  if (isMobile) {
    openStyle = "position: fixed; bottom: 8px; left: 3%; width: 94%; height: 94vh; height: 94dvh; border: none; border-radius: 22px; overflow: hidden; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";
  } else if (isTablet) {
    openStyle = "position: fixed; bottom: 20px; " + position + ": 16px; width: 400px; height: 600px; border: none; border-radius: 22px; overflow: hidden; z-index: 2147483647; background: transparent; pointer-events: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.22); transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light;";
  }

  iframe.style.cssText = closedStyle;
  iframe.allowTransparency = "true";
  
  document.body.appendChild(iframe);

  window.addEventListener('message', function(event) {
    if (event.origin !== baseUrl) return;
    
    // Make sure we only toggle the correct iframe
    if (event.data && event.data.type === 'CHATBOT_TOGGLE' && event.data.position === position) {
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

