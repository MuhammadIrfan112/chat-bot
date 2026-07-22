'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Chatbot.module.css';

// Generate a unique visitor ID for this browser session
const getVisitorId = () => {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = 'visitor_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
    localStorage.setItem('visitor_id', id);
  }
  return id;
};

const CALENDLY_URL = 'https://calendly.com/dariaodum1/30min';

// 5 initial intent options for Real Estate bots
const RE_INTENT_OPTIONS = [
  "🏡 I'm looking to buy a home",
  "💰 I want to know my home's value",
  "🏠 I'm thinking about selling my home",
  "🔑 I'm looking to rent",
  "❓ I have a general real estate question"
];

export default function Chatbot({ isGlobal = false, isDesktopEmbed = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadStep, setLeadStep] = useState(null); // null | 'name' | 'phone' | 'email' | 'time'
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', time_preference: '', property_interest: '' });
  const [botIndustry, setBotIndustry] = useState('Loading');
  const [sessionId, setSessionId] = useState('');
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false); // tracks if user picked an intent

  const messagesEndRef = useRef(null);
  const messageCount = useRef(0);
  const pollRef = useRef(null);

  // Device detection — skip if inside a desktop iframe embed
  useEffect(() => {
    if (isDesktopEmbed) {
      // Force desktop mode — iframe handles sizing externally
      setIsMobile(false);
      setIsTablet(false);
      return;
    }
    const checkDevice = () => {
      // Use parent window width if inside an iframe, else use own window
      let w = window.innerWidth;
      try {
        if (window.parent !== window) {
          w = window.parent.innerWidth || window.innerWidth;
        }
      } catch (e) {
        // Fallback if blocked by cross-origin policy
        w = window.innerWidth;
      }
      setIsMobile(w <= 768);
      setIsTablet(false); // Tablet is merged into mobile for full screen chat
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [isDesktopEmbed]);

  const botConfig = typeof window !== 'undefined' && window.CHATBOT_CONFIG ? window.CHATBOT_CONFIG : {
    botId: null,
    botName: 'RealtyPropFlow AI',
    botAvatar: 'AI',
    primaryColor: '#C9A227',
    welcomeMessage: '👋 Are you interested in growing your business with an AI Chatbot?'
  };

  useEffect(() => {
    if (botConfig?.autoOpen) {
      setTimeout(() => setIsOpen(true), 500); // Small delay for effect
    }
  }, [botConfig]);

  // Whether this is a client bot that should do property/product qualification
  const isClientBot = !!botConfig.botId;
  // Default to qualifying bot for all client bots, even if industry is 'Other' or missing.
  // It will use Real Estate logic by default.
  const isQualifyingBot = isClientBot && botIndustry !== 'Loading';


  useEffect(() => {
    if (isOpen && !sessionId) initSession();
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'CHATBOT_TOGGLE', isOpen }, '*');
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'model', parts: [{ text: botConfig.welcomeMessage }] }]);
    }
    const isClientSite = !!botConfig.botId;
    if (!isClientSite) {
      const hasOpened = sessionStorage.getItem('RealtyPropFlow_auto_opened');
      if (!hasOpened) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem('RealtyPropFlow_auto_opened', 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    // Fetch bot industry IMMEDIATELY on mount
    if (botConfig.botId) {
      fetch(`/api/bot-info?bot_id=${botConfig.botId}`)
        .then(r => r.json())
        .then(d => { setBotIndustry(d.industry || 'Real Estate'); }) // default to RE if missing
        .catch(() => { setBotIndustry('Real Estate'); }); // fallback on error
    } else {
      setBotIndustry('Other'); // SaaS landing page
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When industry loads, if we were waiting to show requirements question, show it now
  useEffect(() => {
    if (isQualifyingBot && leadCaptured && leadStep === 'requirements') {
      // re-trigger message if industry just became known
    }
  }, [botIndustry]);

  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/poll-messages?session_id=${sessionId}&last_count=${messages.length}`);
      const data = await res.json();
      if (data.new_messages?.length > 0) {
        data.new_messages.forEach(msg => {
          if (msg.role === 'admin') {
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: `👨 (Agent): ${msg.content}` }] }]);
          }
        });
      }
      if (data.is_human_takeover !== undefined) setIsHumanTakeover(data.is_human_takeover);
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [sessionId, messages.length]);

  async function initSession() {
    const visitor_id = getVisitorId();
    if (!visitor_id) return;
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_source: botConfig.botName || 'Website Chatbot',
          website_url: window.location.href,
          visitor_id,
          bot_id: botConfig.botId
        })
      });
      const data = await response.json();
      if (data.session_id) setSessionId(data.session_id);
    } catch (e) {
      console.error("Session Init Error:", e);
    }
  }

  const checkLeadTrigger = (currentMessages) => {
    // Lead capture is now explicitly triggered by the AI returning [START_LEAD_CAPTURE] tag
  };

  // Extract all URLs shown by the AI
  const extractViewedLinks = () => {
    const links = new Set();
    messages.forEach(msg => {
      if (msg.role === 'model') {
        const text = msg.parts[0].text;
        // Match standard links [text](url)
        const markdownLinks = text.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
        if (markdownLinks) {
          markdownLinks.forEach(link => {
            const urlMatch = link.match(/\((https?:\/\/[^\s)]+)\)/);
            if (urlMatch && urlMatch[1]) {
              links.add(urlMatch[1]);
            }
          });
        }
      }
    });
    return Array.from(links);
  };

  const saveLead = async (name, phone, email, time_preference) => {
    const viewedLinks = extractViewedLinks();
    
    // Parse conversation to extract structured real estate requirements
    let propertyType = 'Not specified';
    let city = 'Not specified';
    let bedsBaths = 'Not specified';
    let firstTimeBuyer = 'Not specified';
    let schoolReqs = 'Not specified';
    let features = 'Not specified';
    let budget = 'Not specified';
    let timeline = 'Not specified';
    let preApproved = 'Not specified';
    let likedProperty = 'Not specified';

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];
      if (msg.role === 'model' && nextMsg.role === 'user') {
        const text = msg.parts?.[0]?.text?.toLowerCase() || '';
        const ans = nextMsg.parts?.[0]?.text?.trim() || '';
        
        if (!ans) continue;

        if (text.includes('family home') && (text.includes('investment') || text.includes('first home'))) {
          propertyType = ans;
        } else if (text.includes('city') || text.includes('area are you interested')) {
          city = ans;
        } else if (text.includes('bedrooms') && text.includes('bathrooms')) {
          bedsBaths = ans;
        } else if (text.includes('first-time buyer') || text.includes('first time buyer')) {
          firstTimeBuyer = ans;
        } else if (text.includes('school requirements') || text.includes('school preference')) {
          schoolReqs = ans;
        } else if (text.includes('important features') || text.includes('garage, finished basement') || text.includes('swimming pool')) {
          features = ans;
        } else if (text.includes('maximum budget') || text.includes('your budget')) {
          budget = ans;
        } else if (text.includes('purchase by') || text.includes('aiming to purchase')) {
          timeline = ans;
        } else if (text.includes('pre-approved')) {
          preApproved = ans;
        } else if (text.includes('interested in') || text.includes('property did you like') || text.includes('like any of these')) {
          likedProperty = ans;
        }
      }
    }

    const isRealEstate = (botIndustry === 'Real Estate' || botConfig.botName?.toLowerCase().includes('real estate') || botConfig.botName?.toLowerCase().includes('realty') || botConfig.botName?.toLowerCase().includes('property'));

    let finalPropertyInterest = '';
    if (isRealEstate) {
      finalPropertyInterest = `📋 Real Estate Requirements:\n• Property Type: ${propertyType}\n• Target City: ${city}\n• Bedrooms/Baths: ${bedsBaths}\n• First-Time Buyer: ${firstTimeBuyer}\n• School Preference: ${schoolReqs}\n• Desired Features: ${features}\n• Max Budget: ${budget}\n• Target Timeline: ${timeline}\n• Pre-Approved: ${preApproved}\n• Liked Property: ${likedProperty}`;
    } else {
      // Create a fallback summary of what they asked for
      finalPropertyInterest = messages
          .filter(m => m.role === 'user')
          .map(m => m.parts[0].text)
          .join(', ');
    }

    try {
      const res = await fetch('/api/save-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email,
          phone_number: phone,
          time_preference: time_preference,
          property_interest: finalPropertyInterest,
          viewed_links: viewedLinks,
          chatbot_source: botConfig.botName || 'Website Chatbot',
          bot_id: botConfig.botId
        })
      });
      const result = await res.json();
      if (!res.ok) {
        console.error('Lead save failed:', result);
      }
    } catch (err) {
      console.error('Lead save error:', err);
    }

    setLeadCaptured(true);
    setLeadStep(null);
    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: `Thank you, ${name}! 🎉 Your details are saved. We can continue our chat now, what else would you like to know?` }]
    }]);
  };


  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');

    const userMsg = { role: 'user', parts: [{ text: msg }] };
    setMessages(prev => [...prev, userMsg]);
    
    // Handle Intent Selection
    if (!intentSelected && botIndustry === 'Real Estate') {
      setIntentSelected(true);
    }

    // ── Lead info collection ────────────────────────────────────
    if (leadStep === 'name') {
      setLeadData(prev => ({ ...prev, name: msg }));
      setLeadStep('phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Nice to meet you, ${msg}! 👋` }],
        inputCard: { icon: '📞', label: 'Phone Number', placeholder: 'e.g. 0300-1234567 or +92 300 1234567...' }
      }]);
      return;
    }

    if (leadStep === 'phone') {
      const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
      if (!phoneRegex.test(msg.trim())) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "Please enter a valid phone number:" }],
          inputCard: { icon: '📞', label: 'Phone Number', placeholder: 'e.g. 0300-1234567...' }
        }]);
        return;
      }
      setLeadData(prev => ({ ...prev, phone: msg }));
      setLeadStep('email');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Perfect! 📧` }],
        inputCard: { icon: '✉️', label: 'Email Address', placeholder: 'e.g. name@example.com...' }
      }]);
      return;
    }

    if (leadStep === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(msg)) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "That doesn't look like a valid email. Please try again:" }],
          inputCard: { icon: '✉️', label: 'Email Address', placeholder: 'e.g. name@example.com...' }
        }]);
        return;
      }
      setLeadData(prev => ({ ...prev, email: msg }));
      setLeadStep('time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Got it! Lastly, what time works best for you?` }],
        inputCard: { icon: '🕒', label: 'Time Preference', placeholder: 'e.g. Tomorrow morning, or Anytime...' }
      }]);
      return;
    }

    if (leadStep === 'time') {
      setLeadData(prev => ({ ...prev, time_preference: msg }));
      await saveLead(leadData.name, leadData.phone, leadData.email, msg);
      return;
    }


    // ── Requirements (all-at-once) step (REMOVED, handled by AI) ───

    // ── Human takeover ────────────────────────────────────────────
    if (isHumanTakeover) {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, role: 'user', content: msg })
      });
      return;
    }

    // ── Loop (REMOVED, handled by AI natively) ─────────

    // Normal AI chat
    setIsLoading(true);
    messageCount.current += 1;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], session_id: sessionId, bot_id: botConfig.botId }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed");
      }
      const data = await response.json();
      if (data.human_takeover) {
        setIsHumanTakeover(true);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "🔄 You've been connected to a live agent. Please wait for their response..." }] }]);
      } else if (data.reply) {
        let text = data.reply;
        let startLead = false;
        
        // Parse [BUTTON: text]
        const buttons = [];
        text = text.replace(/\[BUTTON:\s*(.*?)\]/g, (match, btnText) => {
           buttons.push(btnText.trim());
           return '';
        });
        
        // Parse [START_LEAD_CAPTURE]
        if (text.includes('[START_LEAD_CAPTURE]')) {
           startLead = true;
           text = text.replace(/\[START_LEAD_CAPTURE\]/g, '');
        }

        const newModelMsg = { role: 'model', parts: [{ text: text.trim() }] };
        if (buttons.length > 0) {
           newModelMsg.quickReplies = buttons;
        }

        setMessages(prev => [...prev, newModelMsg]);
        
        if (startLead && !leadCaptured && leadStep === null) {
          setTimeout(() => {
             setMessages(prev => [...prev, {
                role: 'model',
                parts: [{ text: "Great, would you like me call you tomorrow to arrange the showing? May I know your name?" }],
                inputCard: { icon: '👤', label: 'Your Name', placeholder: 'Enter your full name...' }
             }]);
             setLeadStep('name');
          }, 1500);
        }
      } else {
        throw new Error("Empty response from AI");
      }
    } catch (e) {
      console.error("Chat error:", e);
      const errMsg = e.message ? `Error: ${e.message}` : "Sorry, something went wrong.";
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: errMsg }] }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        checkLeadTrigger(prev);
        return prev;
      });
    }
  };

  const getPlaceholder = () => {
    if (leadStep === 'name') return 'Enter your full name...';
    if (leadStep === 'phone') return 'Enter your phone number...';
    if (leadStep === 'email') return 'Enter your email address...';
    if (leadStep === 'time') return 'Enter your preferred time...';
    if (isHumanTakeover) return 'Message live agent...';
    return 'Type your message...';
  };

  const quickReplies = botConfig.botId
    ? []
    : ["How do I create a chatbot?", "What is the pricing?", "Does it capture leads?"];

  // Show RE intent options for first message, or RealtyPropFlow quick replies, or nothing
  // isREBot is true if industry is Real Estate OR still loading (optimistic for client bots)
  const isREBot = (botIndustry === 'Real Estate' || botIndustry === 'Loading') && botConfig.botId;
  const lastMsg = messages[messages.length - 1];
  let activeQuickReplies = [];
  if (lastMsg && lastMsg.role === 'model' && lastMsg.quickReplies) {
    activeQuickReplies = lastMsg.quickReplies;
  } else if (messages.length === 1) {
    activeQuickReplies = isREBot ? RE_INTENT_OPTIONS : quickReplies;
  }

  return (
    <div id={isGlobal ? 'realty-prop-global-bot' : 'realty-prop-embed-bot'} className={`${styles.chatbotContainer} ${isDesktopEmbed ? styles.forceDesktop : ''} ${isMobile ? styles.mobileContainer : ''} ${isTablet ? styles.tabletContainer : ''}`} style={{ '--primary': botConfig.primaryColor }}>
      {isOpen ? (
        <div className={`${styles.chatWindow} ${isGlobal ? styles.globalChatWindow : ''}`}>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <div className={styles.avatar}>{botConfig.botAvatar}</div>
              <div>
                <div className={styles.title}>{botConfig.botName}</div>
                <div className={styles.status}>
                  {isHumanTakeover ? '🟡 Live Agent Connected' : '🟢 AI Online'}
                </div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className={styles.messagesArea}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.modelMsg}`}>
                {msg.role === 'model' ? (
                  <>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ paddingLeft: '20px', margin: '0 0 8px 0' }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                        a: ({node, ...props}) => <a style={{ color: 'var(--primary)', textDecoration: 'underline' }} target="_blank" {...props} />,
                        strong: ({node, ...props}) => <strong style={{ fontWeight: '700' }} {...props} />,
                        img: ({node, src, alt, ...props}) => (
                          <img
                            src={src} alt={alt || 'Property'}
                            style={{ maxWidth: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', marginTop: '8px', display: 'block' }}
                            {...props}
                          />
                        )
                      }}
                    >
                      {msg.parts[0].text}
                    </ReactMarkdown>

                    {/* Removed redundant inline inputCard */}
                  </>
                ) : (
                  msg.parts[0].text
                )}
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.modelMsg} ${styles.typing}`}>
                <div className={styles.dot}></div><div className={styles.dot}></div><div className={styles.dot}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Calendly Popup */}
          {showCalendly && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 10, display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: '#12213B', color: 'white' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>📅 Book a Free Call</span>
                <button onClick={() => setShowCalendly(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>
              <iframe
                src={`${CALENDLY_URL}?embed_type=Inline&hide_gdpr_banner=1`}
                style={{ flex: 1, border: 'none', width: '100%' }}
                title="Book a Call"
              />
            </div>
          )}

          {activeQuickReplies.length > 0 && (
            <div className={styles.quickReplies}>
              {activeQuickReplies.map((reply, idx) => (
                <button key={idx} onClick={() => handleSend(reply)} className={styles.qrBtn}>{reply}</button>
              ))}
            </div>
          )}

          {!showCalendly && messages.length > 1 && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #F3F4F6' }}>
              <button
                onClick={() => setShowCalendly(true)}
                style={{ width: '100%', padding: '9px', backgroundColor: '#FF7B2C', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
              >
                📅 Book a Free Discovery Call
              </button>
            </div>
          )}

          {leadStep && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 123, 44, 0.08)',
              borderTop: '1px solid rgba(255, 123, 44, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#FF7B2C'
            }}>
              <span>{leadStep === 'name' ? '👤' : leadStep === 'phone' ? '📞' : leadStep === 'email' ? '✉️' : '🕒'}</span>
              <span>
                {leadStep === 'name' ? 'Full Name required to book call' : leadStep === 'phone' ? 'Valid Phone Number required' : leadStep === 'email' ? 'Valid Email Address required' : 'Preferred Contact Time required'}
              </span>
            </div>
          )}

          <div className={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && activeQuickReplies.length === 0) handleSend(); }}
              placeholder={activeQuickReplies.length > 0 ? 'Please select an option above...' : getPlaceholder()}
              className={styles.input}
              disabled={activeQuickReplies.length > 0}
              style={{ opacity: activeQuickReplies.length > 0 ? 0.6 : 1, cursor: activeQuickReplies.length > 0 ? 'not-allowed' : 'text' }}
            />
            <button 
              onClick={() => handleSend()} 
              className={styles.sendBtn}
              disabled={activeQuickReplies.length > 0}
              style={{ opacity: activeQuickReplies.length > 0 ? 0.5 : 1, cursor: activeQuickReplies.length > 0 ? 'not-allowed' : 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`${styles.floatingBtn} ${isMobile ? styles.floatingBtnMobile : ''}`}
          onClick={() => setIsOpen(true)}
          title="Chat with us"
        >
          {isMobile ? '💬' : '💬 Chat with us'}
        </button>
      )}
    </div>
  );
}

