(function() {
  if (window.RealtyPropFlow_INITIALIZED) return;
  window.RealtyPropFlow_INITIALIZED = true;

  var config = window.CHATBOT_CONFIG || {};
  if (!config.botId) {
    console.error('RealtyPropFlow AI: Missing botId in CHATBOT_CONFIG');
    return;
  }

  // Use the script source URL to determine the API domain dynamically
  // If the script is loaded from https://incandescent-lokum.netlify.app/chatbot-embed.js
  // Then the base URL is https://incandescent-lokum.netlify.app
  var scripts = document.getElementsByTagName('script');
  var baseUrl = '';
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('chatbot-embed.js')) {
      var urlObj = new URL(scripts[i].src);
      baseUrl = urlObj.origin;
      break;
    }
  }

  if (!baseUrl) {
    // Fallback if we couldn't parse the script URL
    baseUrl = 'https://chat-bot-ruddy-one.vercel.app';
  }

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = baseUrl + '/bot/' + config.botId;
  iframe.id = 'RealtyPropFlow-chatbot-iframe';
  
  // Initial styles: Small size just for the floating button
  var closedStyle = "position: fixed; bottom: 20px; right: 20px; width: 200px; height: 100px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light;";
  var openStyle = "position: fixed; bottom: 20px; right: 20px; width: 380px; height: 600px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light;";
  
  // Ensure mobile responsiveness
  var isMobile = window.innerWidth <= 480;
  if (isMobile) {
    openStyle = "position: fixed; bottom: 0; right: 0; width: 100vw; height: 100vh; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light;";
  }

  iframe.style.cssText = closedStyle;
  iframe.allowTransparency = "true";
  
  document.body.appendChild(iframe);

  // Listen for messages from the iframe to resize
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
