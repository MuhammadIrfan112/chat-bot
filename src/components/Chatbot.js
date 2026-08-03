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
  const [leadStep, setLeadStep] = useState(null);
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', time_preference: '', property_interest: '' });
  const [botIndustry, setBotIndustry] = useState('Loading');
  const [sessionId, setSessionId] = useState('');
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null); // { property, images, activeIdx }
  const [multiSelectOptions, setMultiSelectOptions] = useState([]); // for multi-select buttons
  const [multiSelected, setMultiSelected] = useState([]); // currently selected multi-select items
  const [likedProperties, setLikedProperties] = useState([]);
  const [dislikedProperties, setDislikedProperties] = useState([]);

  // ── Closing flow state ─────────────────────────────────────────
  // Tracks which step of the closing conversation we're in
  // null | 'ask_callback' | 'callback_name' | 'callback_phone' | 'callback_time'
  //       | 'ask_listings' | 'listings_name' | 'listings_phone' | 'listings_email'
  //       | 'open_ended'
  const [closingStep, setClosingStep] = useState(null);
  const [closingData, setClosingData] = useState({ name: '', phone: '', email: '', time: '' });

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
    primaryColor: '#1E6FD9',
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
      // Auto-open logic removed per user request
      const hasOpened = sessionStorage.getItem('RealtyPropFlow_auto_opened');
      if (!hasOpened) {
        // Just mark it as opened so we don't do it later if we add it back
        sessionStorage.setItem('RealtyPropFlow_auto_opened', 'true');
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
      parts: [{ text: `Thank you, ${name}! 🎉 Your information has been saved.\n\nIs there anything else I can do for you? We will talk to you soon.` }]
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


    // ── Closing Flow Handler ──────────────────────────────────────
    if (closingStep === 'ask_callback') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        setClosingStep('callback_name');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Wonderful! May I have your **full name** please?` }]
        }]);
      } else {
        // No callback → ask about listings
        setClosingStep('ask_listings');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `No problem! Would you like me to **send you some listings** of the available properties in your area?` }],
          quickReplies: ['✅ Yes, send me listings', '❌ No, thank you']
        }]);
      }
      return;
    }

    if (closingStep === 'callback_name') {
      setClosingData(prev => ({ ...prev, name: msg }));
      setClosingStep('callback_phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Nice to meet you, **${msg}**! 👋 What is the best **phone number** to reach you?` }]
      }]);
      return;
    }

    if (closingStep === 'callback_phone') {
      const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
      if (!phoneRegex.test(msg.trim())) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Please enter a valid phone number (e.g. 0300-1234567):` }]
        }]);
        return;
      }
      setClosingData(prev => ({ ...prev, phone: msg }));
      setClosingStep('callback_time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Perfect! 📞 And what is the **best time to call** you?` }]
      }]);
      return;
    }

    if (closingStep === 'callback_time') {
      const data = { ...closingData, time: msg };
      setClosingData(data);
      setClosingStep(null);
      setLeadCaptured(true);
      // Save lead
      await saveLead(data.name, data.phone, '', msg);
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thank you, **${data.name}**! 🎉 Mr. Adnan Alvi will call you at **${data.phone}** around **${msg}**. Is there anything else I can help you with?` }]
      }]);
      return;
    }

    if (closingStep === 'ask_listings') {
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        setClosingStep('listings_name');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! I'll send you some beautiful listings. May I have your **full name** please?` }]
        }]);
      } else {
        // No listings either → open ended
        setClosingStep('open_ended');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Of course! 😊 **What would you like me to do for you?** I'm here to help!` }]
        }]);
        setClosingStep(null); // Reset so AI takes over for open ended
      }
      return;
    }

    if (closingStep === 'listings_name') {
      setClosingData(prev => ({ ...prev, name: msg }));
      setClosingStep('listings_phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Nice to meet you, **${msg}**! 👋 What is your **phone number**?` }]
      }]);
      return;
    }

    if (closingStep === 'listings_phone') {
      const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
      if (!phoneRegex.test(msg.trim())) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Please enter a valid phone number (e.g. 0300-1234567):` }]
        }]);
        return;
      }
      setClosingData(prev => ({ ...prev, phone: msg }));
      setClosingStep('listings_email');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Perfect! And finally, what is your **email address** so I can send the listings to you?` }]
      }]);
      return;
    }

    if (closingStep === 'listings_email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(msg)) {
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `That doesn't look like a valid email. Please try again:` }]
        }]);
        return;
      }
      const data = { ...closingData, email: msg };
      setClosingData(data);
      setClosingStep(null);
      setLeadCaptured(true);
      // Save lead
      await saveLead(data.name, data.phone, msg, '');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thank you, **${data.name}**! 🎉 I'll send the available property listings to **${msg}** shortly. Is there anything else I can help you with?` }]
      }]);
      return;
    }
    // ─────────────────────────────────────────────────────────────

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
        
        // Parse [MULTI_BUTTON: text] tags
        const multiButtons = [];
        const multiPattern = /\[MULTI_BUTTON:\s*(.*?)\]/g;
        let multiMatch;
        while ((multiMatch = multiPattern.exec(text)) !== null) {
          multiButtons.push(multiMatch[1].trim());
        }
        text = text.replace(/\[MULTI_BUTTON:\s*.*?\]/g, '');

        // Parse [START_LEAD_CAPTURE]
        if (text.includes('[START_LEAD_CAPTURE]')) {
           startLead = true;
           text = text.replace(/\[START_LEAD_CAPTURE\]/g, '');
        }

        // Parse [PROPERTY_CARD] blocks
        const parsedProperties = [];
        const cardRegex = /\[PROPERTY_CARD\]([\s\S]*?)\[\/PROPERTY_CARD\]/g;
        text = text.replace(cardRegex, (match, cardContent) => {
          const prop = {};
          
          const typeMatch = cardContent.match(/Type:\s*(.*)/);
          if (typeMatch) prop.property_type = typeMatch[1].trim();
          
          const addressMatch = cardContent.match(/Address:\s*(.*)/);
          if (addressMatch) {
             prop.address = addressMatch[1].trim();
             const parts = prop.address.split(',');
             if (parts.length > 1) prop.city = parts[1].trim();
          }
          
          const priceMatch = cardContent.match(/Price:\s*(.*)/);
          if (priceMatch) prop.price = priceMatch[1].trim();
          
          const bedsMatch = cardContent.match(/Beds:\s*(.*?)\s*\|/);
          if (bedsMatch) prop.bedrooms = bedsMatch[1].trim();
          
          const bathsMatch = cardContent.match(/Baths:\s*(.*)/);
          if (bathsMatch) prop.bathrooms = bathsMatch[1].trim();
          
          const imageMatch = cardContent.match(/Image:\s*(.*)/);
          if (imageMatch) prop.image_url = imageMatch[1].trim();
          
          const linkMatch = cardContent.match(/Link:\s*(.*)/);
          if (linkMatch) prop.url = linkMatch[1].trim();
          
          parsedProperties.push(prop);
          return ''; // Remove the text block from the message
        });

        // The backend now parses the carousel tag and sends properties synchronously!
        const newModelMsg = { role: 'model', parts: [{ text: text.trim() }] };
        if (buttons.length > 0) {
           newModelMsg.quickReplies = buttons;
        }
        if (multiButtons.length > 0) {
          newModelMsg.multiSelectOptions = multiButtons;
        }
        
        // Combine properties from backend data or parsed cards
        const allProperties = [...(data.properties || []), ...parsedProperties];
        if (allProperties.length > 0) {
           newModelMsg.properties = allProperties;
        }

        setMessages(prev => [...prev, newModelMsg]);
        // Activate multi-select if needed
        if (multiButtons.length > 0) {
          setMultiSelectOptions(multiButtons);
          setMultiSelected([]);
        } else {
          setMultiSelectOptions([]);
        }
        
        if (startLead && !leadCaptured && leadStep === null && closingStep === null) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              role: 'model',
              parts: [{ text: `Great! I'd be happy to arrange a viewing for you. To get started, may I have your **full name** please?` }],
              inputCard: { icon: '👤', label: 'Full Name', placeholder: 'e.g. John Doe...' }
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
  const isREBot = (botIndustry === 'Real Estate' || botIndustry === 'Loading' || (botConfig?.name || '').toLowerCase().includes('real state')) && botConfig.botId;
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
                            referrerPolicy="no-referrer"
                            {...props}
                          />
                        )
                      }}
                    >
                      {msg.parts[0].text}
                    </ReactMarkdown>

                    {msg.properties && msg.properties.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        {msg.properties.map((prop, i) => {
                          // Use real images array (Apify) or fallback to URL pattern (old mock data)
                          const makeImages = (prop) => {
                            if (prop.images && Array.isArray(prop.images) && prop.images.length > 0) {
                              return prop.images.slice(0, 6); // Already limited to 6
                            }
                            // Fallback: try generating from realtor.ca CDN pattern
                            const url = prop.image_url || prop.imgSrc || '';
                            if (!url) return [];
                            const imgs = [];
                            for (let n = 1; n <= 5; n++) {
                              imgs.push(url.replace(/_\d+\.jpg$/, `_${n}.jpg`));
                            }
                            return imgs;
                          };
                          return (
                            <div
                              key={i}
                              onClick={() => setGalleryModal({ property: prop, images: makeImages(prop), activeIdx: 0 })}
                              style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid #f0f0f0' }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
                            >
                              <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '6px', left: '6px', background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 'bold', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 2 }}>{i + 1}</div>
                                <img src={prop.image_url} alt={prop.address} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} referrerPolicy="no-referrer" />

                                <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>📸 View Photos</div>
                              </div>
                              <div style={{ padding: '8px 10px 10px' }}>
                                <div style={{ fontWeight: '800', fontSize: '14px', color: '#059669', marginBottom: '3px' }}>{prop.price}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prop.address.split('|')[0]}</div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#374151', borderTop: '1px solid #f3f4f6', paddingTop: '6px' }}>
                                  <span>🛏️ {prop.bedrooms}</span>
                                  <span>🛁 {prop.bathrooms}</span>
                                  <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '10px' }}>{prop.property_type}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', padding: '0 10px 10px', marginTop: '2px' }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const id = prop.mls_number || prop.address;
                                    setLikedProperties(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                    setDislikedProperties(prev => prev.filter(x => x !== id));
                                  }}
                                  style={{ 
                                    flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: likedProperties.includes(prop.mls_number || prop.address) ? '#10b981' : '#f3f4f6', 
                                    color: likedProperties.includes(prop.mls_number || prop.address) ? 'white' : '#4b5563'
                                  }}
                                >
                                  👍 Like
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const id = prop.mls_number || prop.address;
                                    setDislikedProperties(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                                    setLikedProperties(prev => prev.filter(x => x !== id));
                                  }}
                                  style={{ 
                                    flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                    background: dislikedProperties.includes(prop.mls_number || prop.address) ? '#ef4444' : '#f3f4f6', 
                                    color: dislikedProperties.includes(prop.mls_number || prop.address) ? 'white' : '#4b5563'
                                  }}
                                >
                                  👎 Pass
                                </button>
                              </div>
                            </div>
                          );
                        })}
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

          {/* Property Image Gallery Modal */}
          {galleryModal && (
            <div
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.93)', zIndex: 20, display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}
              onClick={(e) => { if (e.target === e.currentTarget) setGalleryModal(null); }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '13px' }}>{galleryModal.property.price}</div>
                  <div style={{ color: '#9ca3af', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{galleryModal.property.address.split('|')[0]}</div>
                </div>
                <button onClick={() => setGalleryModal(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Main Image */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={galleryModal.images[galleryModal.activeIdx]}
                  alt="Property"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {/* Prev Arrow */}
                {galleryModal.activeIdx > 0 && (
                  <button
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: prev.activeIdx - 1 }))}
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                  >‹</button>
                )}
                {/* Next Arrow */}
                {galleryModal.activeIdx < galleryModal.images.length - 1 && (
                  <button
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: prev.activeIdx + 1 }))}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                  >›</button>
                )}
                {/* Image counter */}
                <div style={{ position: 'absolute', bottom: '8px', right: '10px', background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '20px' }}>
                  {galleryModal.activeIdx + 1} / {galleryModal.images.length}
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'rgba(0,0,0,0.6)', overflowX: 'auto', flexShrink: 0 }}>
                {galleryModal.images.map((img, ti) => (
                  <img
                    key={ti}
                    src={img}
                    alt={`Photo ${ti + 1}`}
                    onClick={() => setGalleryModal(prev => ({ ...prev, activeIdx: ti }))}
                    style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, border: ti === galleryModal.activeIdx ? '2px solid #10b981' : '2px solid transparent', opacity: ti === galleryModal.activeIdx ? 1 : 0.6, transition: 'opacity 0.2s, border 0.2s' }}
                    referrerPolicy="no-referrer"
                    onError={(e) => { e.target.parentElement.removeChild(e.target); }}
                  />
                ))}
              </div>

              {/* Property Details Footer */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.7)', display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: '#d1fae5', fontSize: '12px' }}>🛏️ {galleryModal.property.bedrooms} Beds</span>
                <span style={{ color: '#d1fae5', fontSize: '12px' }}>🛁 {galleryModal.property.bathrooms} Baths</span>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{galleryModal.property.property_type}</span>
                <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: 'auto' }}>{galleryModal.property.city}, {galleryModal.property.province}</span>
              </div>
            </div>
          )}

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

          {/* Multi-select buttons (e.g., for features like Garage, Pool, Basement) */}
          {multiSelectOptions.length > 0 && (
            <div className={styles.quickReplies} style={{ flexWrap: 'wrap' }}>
              {multiSelectOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setMultiSelected(prev =>
                    prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                  )}
                  className={`${styles.multiBtn} ${multiSelected.includes(opt) ? styles.multiBtnActive : ''}`}
                >
                  {multiSelected.includes(opt) ? '✓ ' : ''}{opt}
                </button>
              ))}
              <button
                className={styles.multiSubmitBtn}
                onClick={() => {
                  const selection = multiSelected.length > 0 ? multiSelected.join(', ') : 'None';
                  setMultiSelectOptions([]);
                  setMultiSelected([]);
                  handleSend(selection);
                }}
              >
                ✓ Confirm Selection
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              placeholder={getPlaceholder()}
              className={styles.input}
            />
            <button 
              onClick={() => handleSend()} 
              className={styles.sendBtn}
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

