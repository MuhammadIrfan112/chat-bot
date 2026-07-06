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

// Combined requirements question per industry
const getRequirementsQuestion = (industry) => {
  if (industry === 'E-Commerce') {
    return {
      text: `Please tell me what you're looking for — all in **one message**: 🛍️\n\n- What **type of product**? (e.g. shoes, jacket, phone)\n- Any **size or color** preference?\n- What is your **budget**?\n\n*Example: "Red Nike shoes, size 10, budget $150"*`,
      placeholder: 'e.g. Red Nike shoes, size 10, budget $150...'
    };
  }
  return {
    text: `Great! To find your perfect home, please tell me all your requirements **in one message**: 🏡\n\n- How many **bedrooms**?\n- How many **bathrooms**?\n- What **size**? (sqft / marla / kanal)\n- Which **area or city**?\n- What is your **budget**?\n\n*Example: "3 beds, 2 baths, 2000 sqft, Beverly Hills, $1.5M"*`,
    placeholder: 'e.g. 3 beds, 2 baths, 2000 sqft, Beverly Hills, $1.5M...'
  };
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadStep, setLeadStep] = useState(null); // null | 'name' | 'phone' | 'email' | 'requirements'
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', property_interest: '' });
  const [propLoopActive, setPropLoopActive] = useState(false);
  const [botIndustry, setBotIndustry] = useState('Loading');
  const [sessionId, setSessionId] = useState('');
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);

  const messagesEndRef = useRef(null);
  const messageCount = useRef(0);
  const pollRef = useRef(null);

  const botConfig = typeof window !== 'undefined' && window.CHATBOT_CONFIG ? window.CHATBOT_CONFIG : {
    botId: null,
    botName: 'BotFlow AI',
    botAvatar: 'AI',
    primaryColor: '#4F46E5',
    welcomeMessage: '👋 Are you interested in growing your business with an AI Chatbot?'
  };

  // Whether this is a client bot that should do property/product qualification
  const isClientBot = !!botConfig.botId;
  // Default to qualifying bot for all client bots, even if industry is 'Other' or missing.
  // It will use Real Estate logic by default.
  const isQualifyingBot = isClientBot && botIndustry !== 'Loading';

  // Helper to show the combined requirements question
  const showRequirementsQuestion = (setMsgs) => {
    const q = getRequirementsQuestion(botIndustry);
    setMsgs(prev => [...prev, {
      role: 'model',
      parts: [{ text: q.text }],
      inputCard: { icon: '🏡', label: 'Your Requirements', placeholder: q.placeholder }
    }]);
  };

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
      const hasOpened = sessionStorage.getItem('botflow_auto_opened');
      if (!hasOpened) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem('botflow_auto_opened', 'true');
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

  const initSession = async () => {
    const visitor_id = getVisitorId();
    if (!visitor_id) return;
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id, bot_id: botConfig.botId })
    });
    const data = await res.json();
    if (data.session) {
      setSessionId(data.session.id);
      setIsHumanTakeover(data.session.is_human_takeover);
    }
  };

  const checkLeadTrigger = (count, currentMessages) => {
    // Wait until 3 messages have been sent (user has seen responses/properties)
    if (count >= 3 && !leadCaptured && leadStep === null) {
      const conversationText = currentMessages
        .filter(m => m.role === 'user')
        .map(m => m.parts[0].text)
        .join(', ');

      setTimeout(() => {
        setLeadData(prev => ({ ...prev, property_interest: conversationText.slice(0, 300) }));
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "To assist you better and save these preferences, I just need a few details. 😊" }],
          inputCard: { icon: '👤', label: 'Your Name', placeholder: 'Enter your full name...' }
        }]);
        setLeadStep('name');
      }, 800);
    }
  };

  const saveLead = async (name, phone, email, property_interest) => {
    await fetch('/api/save-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        phone_number: phone,
        property_interest,
        chatbot_source: botConfig.botName || 'Website Chatbot',
        bot_id: botConfig.botId
      })
    });
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

    // ── Lead info collection ──────────────────────────────────────
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
      await saveLead(leadData.name, leadData.phone, msg, leadData.property_interest);
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
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.reply }] }]);
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
        checkLeadTrigger(messageCount.current, prev);
        return prev;
      });
    }
  };

  // Input placeholder text based on current step
  const getPlaceholder = () => {
    if (leadStep === 'name') return 'Enter your full name...';
    if (leadStep === 'phone') return 'Enter your phone number...';
    if (leadStep === 'email') return 'Enter your email address...';
    if (leadStep === 'requirements') {
      const q = getRequirementsQuestion(botIndustry);
      return q.placeholder;
    }
    if (isHumanTakeover) return 'Message live agent...';
    return 'Type your message...';
  };

  const quickReplies = botConfig.botId
    ? []
    : ["How do I create a chatbot?", "What is the pricing?", "Does it capture leads?"];

  return (
    <div className={styles.chatbotContainer} style={{ '--primary': botConfig.primaryColor }}>
      {isOpen ? (
        <div className={styles.chatWindow} style={{ position: 'relative' }}>
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

                    {/* Styled Input Card shown inside chat bubble */}
                    {msg.inputCard && (
                      <div style={{
                        marginTop: '10px',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: 'inherit',
                        opacity: 0.8
                      }}>
                        <span style={{ fontSize: '18px' }}>{msg.inputCard.icon}</span>
                        <span style={{ flex: 1, fontStyle: 'italic' }}>{msg.inputCard.placeholder}</span>
                        <span style={{ fontSize: '11px', opacity: 0.6, whiteSpace: 'nowrap' }}>↓ Type below</span>
                      </div>
                    )}
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

          {messages.length === 1 && (
            <div className={styles.quickReplies}>
              {quickReplies.map((reply, idx) => (
                <button key={idx} onClick={() => {
                  if (reply === 'Book a Free Call 📅') {
                    setShowCalendly(true);
                    setMessages(prev => [...prev,
                      { role: 'user', parts: [{ text: reply }] },
                      { role: 'model', parts: [{ text: "Great! Opening the booking calendar for you right now. Pick a time that works best! 📅" }] }
                    ]);
                  } else {
                    handleSend(reply);
                  }
                }} className={styles.qrBtn}>{reply}</button>
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

          <div className={styles.inputArea}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={getPlaceholder()}
              className={styles.input}
            />
            <button onClick={() => handleSend()} className={styles.sendBtn}>Send</button>
          </div>
        </div>
      ) : (
        <button className={styles.floatingBtn} onClick={() => setIsOpen(true)}>
          💬 Chat with us
        </button>
      )}
    </div>
  );
}
