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

// Calendly URL - replace with actual client Calendly link
const CALENDLY_URL = 'https://calendly.com/dariaodum1/30min';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadStep, setLeadStep] = useState(null); // 'name' | 'email'
  const [leadData, setLeadData] = useState({ name: '', email: '' });
  const [sessionId, setSessionId] = useState('');
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageCount = useRef(0);

  const botConfig = typeof window !== 'undefined' && window.CHATBOT_CONFIG ? window.CHATBOT_CONFIG : {
    botId: null,
    botName: 'BotFlow AI',
    botAvatar: 'AI',
    primaryColor: '#4F46E5',
    welcomeMessage: '👋 Are you interested in growing your business with an AI Chatbot?'
  };
  const pollRef = useRef(null);

  useEffect(() => {
    if (isOpen && !sessionId) {
      initSession();
    }
  }, [isOpen]);

  useEffect(() => {
    // Determine configuration on load
    const isClientSite = !!botConfig.botId;
    
    // Set Welcome Message
    const defaultWelcome = botConfig.welcomeMessage;
      
    if (messages.length === 0) {
      setMessages([{ role: 'model', parts: [{ text: defaultWelcome }] }]);
    }

    // Auto-open on the SaaS Landing Page after 1.5 seconds, but ONLY ONCE per session
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for admin messages when human takeover is active
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
      if (data.is_human_takeover !== undefined) {
        setIsHumanTakeover(data.is_human_takeover);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [sessionId, messages.length]);

  const initSession = async () => {
    const visitor_id = getVisitorId();
    if (!visitor_id) return;
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id })
    });
    const data = await res.json();
    if (data.session) {
      setSessionId(data.session.id);
      setIsHumanTakeover(data.session.is_human_takeover);
    }
  };

  const checkLeadTrigger = (count) => {
    if (count >= 3 && !leadCaptured && leadStep === null) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: "😊 You seem interested! May I get your name so I can assist you better?" }]
        }]);
        setLeadStep('name');
      }, 800);
    }
  };

  const saveLead = async (name, email) => {
    await fetch('/api/save-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, chatbot_source: 'SocialMedia110' })
    });
    setLeadCaptured(true);
    setLeadStep(null);
    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: `Thanks ${name}! 🎉 Our team will reach out to ${email} soon. Is there anything else I can help with?` }]
    }]);
  };

  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');

    const userMsg = { role: 'user', parts: [{ text: msg }] };
    setMessages(prev => [...prev, userMsg]);

    // Lead capture flow
    if (leadStep === 'name') {
      setLeadData(prev => ({ ...prev, name: msg }));
      setLeadStep('email');
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: `Nice to meet you, ${msg}! 👋 What's the best email to reach you?` }] }]);
      return;
    }

    if (leadStep === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(msg)) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "That doesn't look like a valid email. Please try again (e.g. name@example.com):" }] }]);
        return;
      }
      await saveLead(leadData.name, msg);
      return;
    }

    // If human has taken over, just show waiting message
    if (isHumanTakeover) {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, role: 'user', content: msg })
      });
      return;
    }

    // Normal AI chat
    setIsLoading(true);
    messageCount.current += 1;

    try {
      const botId = botConfig.botId;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], session_id: sessionId, bot_id: botId }),
      });

      const data = await response.json();
      if (data.human_takeover) {
        setIsHumanTakeover(true);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "🔄 You've been connected to a live agent. Please wait for their response..." }] }]);
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.reply }] }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Sorry, something went wrong." }] }]);
    } finally {
      setIsLoading(false);
      checkLeadTrigger(messageCount.current);
    }
  };

  const quickReplies = botConfig.botId 
    ? ["What services do you offer?", "Can I see your pricing?", "Book a Free Call 📅"]
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
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p style={{ margin: '0 0 10px 0' }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0' }} {...props} />,
                      ol: ({node, ...props}) => <ol style={{ paddingLeft: '20px', margin: '0 0 10px 0' }} {...props} />,
                      li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                      a: ({node, ...props}) => <a style={{ color: 'var(--primary)', textDecoration: 'underline' }} target="_blank" {...props} />,
                      strong: ({node, ...props}) => <strong style={{ fontWeight: '700' }} {...props} />
                    }}
                  >
                    {msg.parts[0].text}
                  </ReactMarkdown>
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

          {/* Calendly Booking Popup */}
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
                      { role: 'model', parts: [{ text: "Great! Opening the booking calendar for you right now. Pick a time that works best for you! 📅" }] }
                    ]);
                  } else {
                    handleSend(reply);
                  }
                }} className={styles.qrBtn}>{reply}</button>
              ))}
            </div>
          )}

          {/* Book a Call Button (always visible) */}
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
              placeholder={leadStep === 'name' ? "Enter your name..." : leadStep === 'email' ? "Enter your email..." : isHumanTakeover ? "Message live agent..." : "Type your message..."}
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
