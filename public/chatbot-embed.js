(function() {
  if (window.RealtyPropFlow_INITIALIZED) return;
  window.RealtyPropFlow_INITIALIZED = true;

  var config = window.CHATBOT_CONFIG || {};
  if (!config.botId) {
    console.error('RealtyPropFlow AI: Missing botId in CHATBOT_CONFIG');
    return;
  }

  // Use the script source URL to determine the API domain dynamically
  var scripts = document.getElementsByTagName('script');
  var baseUrl = '';
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && (scripts[i].src.includes('chatbot-embed.js') || scripts[i].src.includes('chatbot-widget.js'))) {
      var urlObj = new URL(scripts[i].src);
      baseUrl = urlObj.origin;
      break;
    }
  }

  if (!baseUrl) {
    baseUrl = 'https://www.realtypropflow.com';
  }

  // Ensure mobile responsiveness
  var isMobile = window.innerWidth <= 768;

  // Create iframe
  var iframe = document.createElement('iframe');
  var timestamp = new Date().getTime();
  var autoOpenParam = config.autoOpen ? '&autoOpen=true' : '';
  var iframeUrl = baseUrl + '/bot/' + config.botId + (isMobile ? '?device=mobile' : '?desktop=true') + autoOpenParam + '&v=' + timestamp;
  iframe.src = iframeUrl;
  iframe.id = 'RealtyPropFlow-chatbot-iframe';
  iframe.scrolling = 'no'; // ✅ Prevents internal scrollbar gap
  iframe.frameBorder = '0';
  iframe.allowTransparency = 'true';
  
  // Closed state: only button size visible, no scrollbar gap
  var closedStyle = "position: fixed; bottom: 20px; right: 20px; width: 200px; height: 70px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light; overflow: hidden;";
  var openStyle = "position: fixed; bottom: 20px; right: 20px; width: 400px; height: 660px; max-height: calc(100vh - 36px); border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); color-scheme: light; overflow: hidden;";
  
  if (isMobile) {
    closedStyle = "position: fixed; bottom: 16px; right: 16px; width: 80px; height: 80px; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light; overflow: hidden;";
    openStyle = "position: fixed; bottom: 10px; left: 3%; width: 94%; height: 92vh; height: 92dvh; max-height: 92dvh; border: none; z-index: 2147483647; background: transparent; pointer-events: auto; transition: all 0.3s ease; color-scheme: light; overflow: hidden; border-radius: 22px; box-sizing: border-box;";
  }

  iframe.style.cssText = closedStyle;
  
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
