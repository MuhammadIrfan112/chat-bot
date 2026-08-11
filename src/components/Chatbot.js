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

export default function Chatbot({ isGlobal = false, isDesktopEmbed = false, initialConfig = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [embedPlan, setEmbedPlan] = useState(null);
  const [embedPosition, setEmbedPosition] = useState('right');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadStep, setLeadStep] = useState(null);
  const [leadData, setLeadData] = useState({ name: '', phone: '', email: '', time_preference: '', property_interest: '' });
  const [botIndustry, setBotIndustry] = useState('Loading');
  const [sessionId, setSessionId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isHumanTakeover, setIsHumanTakeover] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [intentSelected, setIntentSelected] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null); // { property, images, activeIdx }
  const [multiSelectOptions, setMultiSelectOptions] = useState([]); // for multi-select buttons
  const [multiSelected, setMultiSelected] = useState([]); // currently selected multi-select items
  const [likedProperties, setLikedProperties] = useState([]);
  const [dislikedProperties, setDislikedProperties] = useState([]);
  const [activeApifyRunId, setActiveApifyRunId] = useState(null);
  const [expandedCityPanel, setExpandedCityPanel] = useState(null); // which city btn is open

  // ── Closing flow state ─────────────────────────────────────────
  // Tracks which step of the closing conversation we're in
  // null | 'ask_callback' | 'callback_name' | 'callback_phone' | 'callback_time'
  //       | 'ask_listings' | 'listings_name' | 'listings_phone' | 'listings_email'
  //       | 'open_ended'
  const [closingStep, setClosingStep] = useState(null);
  const [closingData, setClosingData] = useState({ name: '', phone: '', email: '', time: '' });

  const [buyHomeStep, setBuyHomeStep] = useState(null);
  const [buyHomeData, setBuyHomeData] = useState({
    goal: '', city: '', type: '', bedrooms: '', bathrooms: '', firstTime: '', features: '', schools: '', budget: '', timeline: '', mortgage: '', agent: '',
    inv_type: '', inv_prop_type: '', inv_downpayment: '', inv_location: '', inv_experience: '', inv_financing: '', inv_return: ''
  });

  const messagesEndRef = useRef(null);
  const messageCount = useRef(0);
  const pollRef = useRef(null);

  // Device detection — skip if inside a desktop iframe embed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Try URL param first, then window.CHATBOT_CONFIG.plan (injected by server)
      const planFromUrl = params.get('plan');
      const planFromConfig = window.CHATBOT_CONFIG?.plan;
      if (planFromUrl) setEmbedPlan(planFromUrl);
      else if (planFromConfig) setEmbedPlan(planFromConfig);
      if (params.get('position')) setEmbedPosition(params.get('position'));
    }

    if (isDesktopEmbed) {
      // Force desktop mode — iframe handles sizing externally
      setIsMobile(false);
      setIsTablet(false);
      return;
    }
    const checkDevice = () => {
      let w = window.innerWidth;
      try {
        if (window.parent !== window) {
          w = window.parent.innerWidth || window.innerWidth;
        }
      } catch (e) {
        w = window.innerWidth;
      }
      setIsMobile(w <= 768);
      setIsTablet(false);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [isDesktopEmbed]);

  const botConfig = initialConfig || (typeof window !== 'undefined' && window.CHATBOT_CONFIG ? window.CHATBOT_CONFIG : {
    botId: null,
    botName: 'RealtyPropFlow AI',
    botAvatar: 'AI',
    primaryColor: '#1E6FD9',
    welcomeMessage: '👋 Are you interested in growing your business with an AI Chatbot?'
  });

  const isDemoBot = botConfig.botId === 'demo-real-estate' || botConfig.botId === 'demo-ecommerce';

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
    setMounted(true);
  }, []);


  useEffect(() => {
    if (isOpen && !sessionId) initSession();
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'CHATBOT_TOGGLE', isOpen, position: embedPosition }, '*');
    }
  }, [isOpen, embedPosition]);

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

  // Poll Apify results if a run is active
  useEffect(() => {
    if (!activeApifyRunId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/apify-result?runId=${activeApifyRunId}`);
        const data = await res.json();

        if (data.status === 'done' && data.properties) {
          clearInterval(interval);
          setActiveApifyRunId(null);
          // Append the properties to the LAST model message in the chat
          setMessages(prev => {
            const newMessages = [...prev];
            for (let i = newMessages.length - 1; i >= 0; i--) {
              if (newMessages[i].role === 'model') {
                newMessages[i] = {
                  ...newMessages[i],
                  properties: data.properties
                };
                break;
              }
            }
            return newMessages;
          });
        } else if (data.status === 'empty' || data.status === 'failed' || data.status === 'error') {
          clearInterval(interval);
          setActiveApifyRunId(null);
          
          // Reverted mock data as requested — show error instead
          setMessages(prev => [...prev, { 
            role: 'model', 
            parts: [{ text: "I'm sorry, I couldn't find any live properties matching that description right now. The property server might be temporarily blocking our search. Let me know if you want to try a different city!" }] 
          }]);
        }
      } catch (e) {
        console.error('Apify polling error:', e);
      }
    }, 8000); // Poll every 8 seconds

    return () => clearInterval(interval);
  }, [activeApifyRunId]);

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
      if (data.session && data.session.id) {
        setSessionId(data.session.id);
        
        // Fetch previous messages for this session so the user can continue where they left off
        try {
          const histRes = await fetch(`/api/poll-messages?session_id=${data.session.id}&fetch_history=true`);
          const histData = await histRes.json();
          if (histData.history && histData.history.length > 0) {
            const formattedHistory = histData.history.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.role === 'admin' ? `👨 (Agent): ${msg.content}` : msg.content }]
            }));
            // Only set if we don't already have messages (to avoid overriding active session)
            setMessages(prev => prev.length === 0 ? formattedHistory : prev);
          }
        } catch (err) {
          console.error("Error fetching chat history:", err);
        }
      }
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
    let propertyType = 'Unknown', city = 'Unknown', bedsBaths = 'Unknown', firstTimeBuyer = 'Unknown', schoolReqs = 'Unknown', features = 'Unknown', budget = 'Unknown', timeline = 'Unknown', preApproved = 'Unknown', likedProperty = 'None', agentStatus = 'Unknown', extraInfoReq = 'None';

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
        } else if (text.includes('purchase by') || text.includes('aiming to purchase') || text.includes('planning to purchase')) {
          timeline = ans;
        } else if (text.includes('pre-approved')) {
          preApproved = ans;
        } else if (text.includes('working with any other real estate agent')) {
          agentStatus = ans;
        } else if (text.includes('interested in') || text.includes('property did you like') || text.includes('like any of these')) {
          likedProperty = ans;
        } else if (text.includes('information on first time buying') || text.includes('information on investment properties') || text.includes('information about the buying process')) {
          extraInfoReq = ans;
        }
      }
    }

    // Parse property summary from the structured summary if available
    const summaryMsg = allMsgs.slice().reverse().find(m => m.role === 'model' && (m.parts?.[0]?.text?.includes('Location:') || m.parts?.[0]?.text?.includes('market value')));
    let sumOccupants = '', sumPets = '', sumParking = '', sumRentTimeline = '';
    
    if (summaryMsg) {
      const st = summaryMsg.parts[0].text;
      const loc = st.match(/Location:\s*(.+)/)?.[1]?.trim(); if (loc) sumCity = loc;
      const prop = st.match(/Property:\s*(.+)/)?.[1]?.trim(); if (prop) sumPropType = prop;
      const b = st.match(/Bedrooms:\s*(.+)/)?.[1]?.trim(); if (b) sumBeds = b;
      const bth = st.match(/Bathrooms:\s*(.+)/)?.[1]?.trim(); if (bth) sumBaths = bth;
      const feat = st.match(/(?:Important|Must-have) features:\s*(.+)/)?.[1]?.trim(); if (feat) sumFeatures = feat;
      const bud = st.match(/Maximum budget:\s*(.+)/)?.[1]?.trim(); if (bud) sumBudget = bud;
      const tl = st.match(/Purchase timeline:\s*(.+)/)?.[1]?.trim(); if (tl) sumTimeline = tl;
      const mg = st.match(/Mortgage:\s*(.+)/)?.[1]?.trim(); if (mg) sumMortgage = mg;
      const sc = st.match(/School preference:\s*(.+)/)?.[1]?.trim(); if (sc) sumSchool = sc;
      // Rent specific fields
      const occ = st.match(/Occupants:\s*(.+)/)?.[1]?.trim(); if (occ) sumOccupants = occ;
      const pets = st.match(/Pets:\s*(.+)/)?.[1]?.trim(); if (pets) sumPets = pets;
      const park = st.match(/Parking:\s*(.+)/)?.[1]?.trim(); if (park) sumParking = park;
      const rentTl = st.match(/Moving timeline:\s*(.+)/)?.[1]?.trim(); if (rentTl) sumRentTimeline = rentTl;
    }

    const isRealEstate = (botIndustry === 'Real Estate' || botConfig.botName?.toLowerCase().includes('real estate') || botConfig.botName?.toLowerCase().includes('realty') || botConfig.botName?.toLowerCase().includes('property'));

    let finalPropertyInterest = '';
    const isRent = !!sumOccupants || !!sumPets || !!sumRentTimeline || allMsgs.some(m => m.parts[0].text.toLowerCase().includes('looking to rent'));
    const isSell = allMsgs.some(m => m.parts[0].text.toLowerCase().includes('understand your home\'s value') || m.parts[0].text.toLowerCase().includes('considering selling'));
    const leadType = isSell ? 'Selling Home' : isRent ? 'Renting Home' : 'Buying Home';

    if (isRealEstate) {
      if (isSell) {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Seller Details:\n• Reason for selling: ${messages.find(m=>m.parts[0].text.toLowerCase().includes('reason you are considering selling')) ? 'Captured in chat' : 'Not specified'}\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Timeline: ${timeline || 'Not specified'}`;
      } else if (isRent) {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Renter Requirements:\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Target City: ${sumCity || city || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Max Budget: ${sumBudget || budget || 'Not specified'}\n• Occupants: ${sumOccupants || 'Not specified'}\n• Pets: ${sumPets || 'Not specified'}\n• Moving Timeline: ${sumRentTimeline || 'Not specified'}`;
      } else {
        finalPropertyInterest = `[Lead Type: ${leadType}]\n📋 Buyer Requirements:\n• Property Type: ${sumPropType || propertyType || 'Not specified'}\n• Target City: ${sumCity || city || 'Not specified'}\n• Bedrooms: ${sumBeds || bedsBaths || 'Not specified'}\n• Max Budget: ${sumBudget || budget || 'Not specified'}\n• Pre-Approved: ${sumMortgage || preApproved || 'Not specified'}\n• Timeline: ${sumTimeline || timeline || 'Not specified'}\n• First-Time Buyer: ${firstTimeBuyer || 'Not specified'}`;
      }
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
      if (!res.ok) console.error('Lead save failed:', result);
    } catch (err) {
      console.error('Lead save error:', err);
    }

    setLeadCaptured(true);
    setLeadStep(null);

    const isStandard = embedPlan === 'standard';
    let confirmMsg = `You're all set, ${name}! 🎉\n\nYour information has been saved and our team will be in touch soon.`;
    
    if (buyHomeData?.goal === 'Investment Property') {
      confirmMsg = `Thank you! Your information has been submitted. 🎉\n\nYour call is all set. A real estate professional will connect with you at the scheduled time to discuss your home search and answer any questions.\n\nWe look forward to speaking with you! 🏡`;
    } else if (isStandard) {
      const isRent = !!sumOccupants || !!sumPets || !!sumRentTimeline;
      let reqLines = [];
      
      if (isRent) {
        reqLines = [
          sumBeds ? `🏡 ${sumBeds}-bedroom ${sumPropType || 'rental'}` : '',
          sumCity ? `📍 ${sumCity}` : '',
          sumBaths ? `🛁 ${sumBaths} bathrooms` : '',
          sumOccupants ? `👥 Occupants: ${sumOccupants}` : '',
          sumPets ? `🐾 Pets: ${sumPets}` : '',
          sumParking ? `🚗 Parking: ${sumParking}` : '',
          sumFeatures && sumFeatures !== 'None' ? `✨ Features: ${sumFeatures}` : '',
          sumBudget ? `💰 Budget: ${sumBudget}` : '',
          sumRentTimeline ? `📅 Moving in: ${sumRentTimeline.toLowerCase()}` : '',
        ];
      } else {
        reqLines = [
          sumBeds ? `🏡 ${sumBeds}-bedroom ${sumPropType || 'property'}` : '',
          sumCity ? `📍 ${sumCity}` : '',
          sumBaths ? `🛁 ${sumBaths} bathrooms` : '',
          sumFeatures && sumFeatures !== 'None' ? `✨ Features: ${sumFeatures}` : '',
          sumBudget ? `💰 Up to ${sumBudget}` : '',
          (sumMortgage && sumMortgage.toLowerCase() !== 'not pre-approved') ? `🏦 Mortgage pre-approved` : '',
          sumTimeline ? `📅 Looking to purchase ${sumTimeline.toLowerCase()}` : '',
        ];
      }

      confirmMsg = `You're all set, ${name}! 🎉\n\nYour home search request has been successfully submitted to our real estate team.\n\n**Your requirements:**\n${reqLines.filter(Boolean).join('\n')}\n\n**What happens next?**\nAn agent from our team will review your requirements and look for properties that closely match your search. They will contact you during your preferred **${time_preference}** hours to discuss suitable properties and the next steps.\n\nWe're looking forward to helping you find the right home! 🏡`;
    }

    setMessages(prev => [...prev, {
      role: 'model',
      parts: [{ text: confirmMsg }]
    }]);
  };


  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');

    const userMsg = { role: 'user', parts: [{ text: msg }] };
    const apiMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    
    // Handle Intent Selection
    if (!intentSelected && botIndustry === 'Real Estate') {
      setIntentSelected(true);
    }

    // ── Buy a Home Flow ─────────────────────────────────────────
    if (msg.includes("I'm looking to buy a home") && !buyHomeStep) {
      setBuyHomeStep('goal');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you looking for a family home or an investment property?` }],
        quickReplies: ['🏡 Family Home', '💰 Investment Property']
      }]);
      return;
    }

    if (buyHomeStep === 'goal') {
      if (msg.toLowerCase().includes('family home')) {
        setBuyHomeData(prev => ({ ...prev, goal: 'Family Home' }));
        setBuyHomeStep('city');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `Great! 🏡 ${botConfig.botName || 'Shawna Roongsang'} has helped 20+ families find their perfect home in the area, so you're in great hands!\n\nI'll ask you a few quick questions to understand exactly what you're looking for.\n\nWhich city or area are you interested in?` }]
        }]);
      } else {
        setBuyHomeData(prev => ({ ...prev, goal: 'Investment Property' }));
        setBuyHomeStep('inv_type');
        setMessages(prev => [...prev, {
          role: 'model',
          parts: [{ text: `What type of investment are you considering?` }],
          quickReplies: ['Long-term rental', 'Short-term rental', 'Fix-and-flip', 'Multi-family investment', 'Build-to-rent', 'Not sure yet']
        }]);
      }
      return;
    }

    if (buyHomeStep === 'city') {
      setBuyHomeData(prev => ({ ...prev, city: msg }));
      setBuyHomeStep('type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `what type of home are you looking for? You can select multiple options!` }]
      }]);
      setMultiSelectOptions(['🏢 Condo', '🏘️ Townhouse', 'Detached', 'Semi Detached', '🏡 Duplex / Multi-family home', '🌳 Villa / Luxury home', '🤷 Other']);
      return;
    }

    if (buyHomeStep === 'type') {
      setBuyHomeData(prev => ({ ...prev, type: msg }));
      setBuyHomeStep('bedrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `${buyHomeData.city || 'That city'} is a fantastic area! It has great communities and strong property values.\n\nHow many bedrooms are you looking for?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'bedrooms') {
      setBuyHomeData(prev => ({ ...prev, bedrooms: msg }));
      setBuyHomeStep('bathrooms');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `And how many bathrooms?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'bathrooms') {
      setBuyHomeData(prev => ({ ...prev, bathrooms: msg }));
      setBuyHomeStep('first_time');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you a first-time buyer?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'first_time') {
      const isFirst = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setBuyHomeData(prev => ({ ...prev, firstTime: isFirst ? 'Yes' : 'No' }));
      setBuyHomeStep('features');
      
      const replyText = isFirst 
        ? `That’s exciting—congratulations on taking the first step toward owning your first home! 🏡\n\nFirst-time buyers may have access to special financing and assistance programs, and we can help you understand your options, budget, neighborhoods, and available homes.\n\nAre there any important features you’re looking for? You can select multiple options!`
        : `Since you’re an experienced homebuyer, let’s focus on what’s most important for your next purchase—whether that’s more space, a new neighborhood, a better commute, or a specific budget.\n\nAre there any important features you’re looking for? You can select multiple options!`;
      
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: replyText }] }]);
      setMultiSelectOptions(['🌊 Swimming Pool', '🏠 Basement', '🚗 Garage']);
      return;
    }

    if (buyHomeStep === 'features') {
      setBuyHomeData(prev => ({ ...prev, features: msg }));
      setBuyHomeStep('schools');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Do you have any specific school requirements? You can select multiple options!` }]
      }]);
      setMultiSelectOptions(['🏦 Primary School', '🏢 Middle School', '🏧 Elementary School']);
      return;
    }

    if (buyHomeStep === 'schools') {
      setBuyHomeData(prev => ({ ...prev, schools: msg }));
      setBuyHomeStep('budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is your maximum budget?` }]
      }]);
      return;
    }

    if (buyHomeStep === 'budget') {
      setBuyHomeData(prev => ({ ...prev, budget: msg }));
      setBuyHomeStep('timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Thanks! When are you planning to purchase?` }],
        quickReplies: ['Within 3 months', 'Within 6 months', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'timeline') {
      setBuyHomeData(prev => ({ ...prev, timeline: msg }));
      setBuyHomeStep('mortgage');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Have you been pre-approved for a mortgage?` }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'mortgage') {
      const isPreApproved = msg.toLowerCase().includes('yes') || msg.includes('✅');
      setBuyHomeData(prev => ({ ...prev, mortgage: isPreApproved ? 'Pre-approved' : 'Not pre-approved' }));
      setBuyHomeStep('agent');
      
      const replyParts = [];
      if (!isPreApproved) {
        replyParts.push(`That’s okay— Getting preapproved can help you understand your potential budget and what loan options may be available to you.`);
      }
      replyParts.push(`Are you currently working with any other real estate agent?`);
      
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: replyParts.join('\n\n') }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'agent') {
      const hasAgent = msg.toLowerCase().includes('yes') || msg.includes('✅');
      const newBuyData = { ...buyHomeData, agent: hasAgent ? 'Yes' : 'No' };
      setBuyHomeData(newBuyData);
      setBuyHomeStep('summary');

      let replyParts = [];
      if (hasAgent) {
        replyParts.push(`Thanks for letting me know! How are things going with your current agent—are you happy with them, or are you considering a change? If you have an agreement with them, do you know when it ends?\n\nSince you’re already working with a real estate agent, we’ll respect that relationship. If you need help with anything else related to your home search or mortgage, I’m happy to help.`);
      } else {
        replyParts.push(`Got it! Since you’re not currently working with another agent, I can help you take the next step.`);
      }

      const summaryText = `Here's what I have for your home search:\nLocation: ${newBuyData.city}\nProperty: Family Home\nBedrooms: ${newBuyData.bedrooms}\nBathrooms: ${newBuyData.bathrooms}\nImportant features: ${newBuyData.features}\nSchool preference: ${newBuyData.schools}\nMaximum budget: ${newBuyData.budget}\nFirst-time buyer: ${newBuyData.firstTime}\nMortgage: ${newBuyData.mortgage}\nPurchase timeline: ${newBuyData.timeline}\nCurrently working with an agent: ${newBuyData.agent}\n\nDoes everything look correct?`;

      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: replyParts.join('\n\n') }]
      }, {
        role: 'model',
        parts: [{ text: summaryText }],
        quickReplies: ['✅ Yes', '❌ No']
      }]);
      return;
    }

    if (buyHomeStep === 'summary') {
      setBuyHomeStep(null);
      const isYes = msg.toLowerCase().includes('yes') || msg.includes('✅');
      if (isYes) {
        if (embedPlan === 'standard' || !embedPlan) {
          setMessages(prev => [...prev, {
            role: 'model',
            parts: [{ text: `Thanks! I’ve noted your requirements. Please provide your contact details below, and an agent will be in touch to help you with your home search.` }]
          }]);
          setLeadStep('name');
          return;
        } else {
          // Premium: override the msg to trigger property search via AI
          const searchPrompt = `My requirements: ${buyHomeData.bedrooms} beds in ${buyHomeData.city}, budget ${buyHomeData.budget}. Please show me properties.`;
          apiMessages.pop(); // remove "yes"
          apiMessages.push({ role: 'user', parts: [{ text: searchPrompt }] });
        }
      } else {
         setMessages(prev => [...prev, {
           role: 'model',
           parts: [{ text: `No problem. Let me know what you'd like to change.` }]
         }]);
         return;
      }
    }

    // ── Investment Property Flow ────────────────────────────────
    if (buyHomeStep === 'inv_type') {
      setBuyHomeData(prev => ({ ...prev, inv_type: msg }));
      setBuyHomeStep('inv_prop_type');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What type of property are you interested in?` }],
        quickReplies: ['Single-family home', 'Condo', 'Townhouse', '2–4 unit property', 'Larger multi-family property', 'Commercial property', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_prop_type') {
      setBuyHomeData(prev => ({ ...prev, inv_prop_type: msg }));
      setBuyHomeStep('inv_budget');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What’s your approximate investment budget?` }],
        quickReplies: ['Under $200K', '$200K–$300K', '$300K–$500K', '$500K–$750K', '$750K–$1M', '$1M+', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_budget') {
      setBuyHomeData(prev => ({ ...prev, inv_budget: msg }));
      setBuyHomeStep('inv_downpayment');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How much are you planning to put toward the purchase?` }],
        quickReplies: ['Less than 20%', '20%–30%', '30%–50%', '50%+', 'I’m not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_downpayment') {
      setBuyHomeData(prev => ({ ...prev, inv_downpayment: msg }));
      setBuyHomeStep('inv_factors');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What matters most to you in an investment property? You can select multiple options.` }]
      }]);
      setMultiSelectOptions(['Monthly rental income', 'Long-term appreciation', 'High rental demand', 'Low maintenance', 'Lower property taxes', 'Strong neighborhood growth', 'Quick resale potential', 'Diversifying my investments']);
      return;
    }

    if (buyHomeStep === 'inv_factors') {
      setBuyHomeData(prev => ({ ...prev, features: msg })); // reusing features state for multi-select
      setBuyHomeStep('inv_location');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Are you focused on a specific area, or are you open to different markets?` }],
        quickReplies: ['Specific neighborhood/city', 'Anywhere nearby', 'Anywhere in the state', 'Open to different markets']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_location') {
      setBuyHomeData(prev => ({ ...prev, inv_location: msg }));
      setBuyHomeStep('inv_timeline');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `When are you hoping to purchase your investment property?` }],
        quickReplies: ['As soon as possible', 'Within 3 months', '3–6 months', '6–12 months', 'Just exploring']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_timeline') {
      setBuyHomeData(prev => ({ ...prev, timeline: msg }));
      setBuyHomeStep('inv_experience');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `Have you invested in real estate before?` }],
        quickReplies: ['Yes, I own investment properties', 'Yes, but I’ve sold my previous investments', 'No, this would be my first investment property']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_experience') {
      setBuyHomeData(prev => ({ ...prev, inv_experience: msg }));
      setBuyHomeStep('inv_financing');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `How do you plan to finance the investment?` }],
        quickReplies: ['Cash', 'Conventional mortgage', 'Investment/property loan', 'HELOC or other financing', 'Not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_financing') {
      setBuyHomeData(prev => ({ ...prev, inv_financing: msg }));
      setBuyHomeStep('inv_return');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What kind of return are you hoping to achieve?` }],
        quickReplies: ['Monthly cash flow', 'Long-term appreciation', 'Both', 'I’m not sure yet']
      }]);
      return;
    }

    if (buyHomeStep === 'inv_return') {
      setBuyHomeData(prev => ({ ...prev, inv_return: msg }));
      setBuyHomeStep(null); // End of wizard
      
      const replyText = `Perfect! We have a good picture of what you’re looking for. 🎯\n\nThe next step is to connect you with ${botConfig.botName || 'our agent'} who can help you explore your options and answer any questions.\n\nWould you like to schedule a quick call?\n\nShare your contact information below, and we’ll help you find a convenient time.`;
      
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: replyText }]
      }]);
      
      setLeadStep('name'); // trigger lead capture directly
      return;
    }

    // ── Lead info collection ────────────────────────────────────
    if (leadStep === 'name') {
      setLeadData(prev => ({ ...prev, name: msg }));
      setLeadStep('phone');
      setMessages(prev => [...prev, {
        role: 'model',
        parts: [{ text: `What is the best phone number for our agent to reach you?` }],
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
        parts: [{ text: `And what email address should we use to send you matching property information and follow-up details?` }],
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
        parts: [{ text: `What time is usually best for our agent to reach you?` }],
        quickReplies: ['🌅 Morning', '☀️ Afternoon', '🌆 Evening', '🕐 Anytime']
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

    // Normal AI chat
    setIsLoading(true);
    messageCount.current += 1;

    try {
      const payload = {
        messages: apiMessages,
        session_id: sessionId,
        bot_id: botConfig.botId,
        plan: embedPlan || 'premium' // Use embedPlan from URL or default to premium
      };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        
        // Parse [CITY_BTN: label] tags — city accordion buttons
        const cityBtns = [];
        text = text.replace(/\[CITY_BTN:\s*(.*?)\]/g, (match, label) => {
          cityBtns.push(label.trim());
          return '';
        });

        // Parse [CITY_INFO: label | content] tags — accordion content
        const cityInfoMap = {};
        text = text.replace(/\[CITY_INFO:\s*(.*?)\|([\s\S]*?)\]/g, (match, label, content) => {
          cityInfoMap[label.trim()] = content.trim();
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
        if (cityBtns.length > 0) {
          newModelMsg.cityBtns = cityBtns;
          newModelMsg.cityInfoMap = cityInfoMap;
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

        if (data.apifyRunId) {
          setActiveApifyRunId(data.apifyRunId);
        }
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
              parts: [{ text: `What name should our agent use when contacting you?` }],
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

  const resetChat = () => {
    setMessages([{ role: 'model', parts: [{ text: botConfig.welcomeMessage }] }]);
    setInput('');
    setIntentSelected(false);
    setSessionId(null);
    setIsHumanTakeover(false);
    setIsLoading(false);
    setClosingStep(null);
    setClosingData({ name: '', phone: '', email: '', time: '' });
    messageCount.current = 0;
  };

  const showHumanTakeover = !!botConfig.botId && !isHumanTakeover && embedPlan !== 'standard';
  const isRealEstate = (botIndustry === 'Real Estate' || botConfig.botName?.toLowerCase().includes('real estate') || botConfig.botName?.toLowerCase().includes('realty') || botConfig.botName?.toLowerCase().includes('property'));

  // Show RE intent options for first message, or RealtyPropFlow quick replies, or nothing
  // isREBot is true if industry is Real Estate OR still loading (optimistic for client bots)
  const isREBot = (botIndustry === 'Real Estate' || botIndustry === 'Loading' || (botConfig?.name || '').toLowerCase().includes('real state')) && botConfig.botId;
  const lastMsg = messages[messages.length - 1];
  let activeQuickReplies = [];

  if (intentSelected && closingStep && closingStep !== 'open_ended' && showHumanTakeover) {
    activeQuickReplies = ["🙋‍♀️ Talk to Human"];
  } else if (lastMsg && lastMsg.role === 'model' && lastMsg.quickReplies) {
    activeQuickReplies = lastMsg.quickReplies;
  } else if (messages.length === 1 && isREBot) {
    activeQuickReplies = RE_INTENT_OPTIONS;
  } else if (messages.length === 1 && !botConfig.botId) {
    activeQuickReplies = ["How do I create a chatbot?", "What is the pricing?", "Does it capture leads?"];
  }

  if (!mounted) return null;

  return (
    <div id={isGlobal ? 'realty-prop-global-bot' : 'realty-prop-embed-bot'} className={`${styles.chatbotContainer} ${isDesktopEmbed ? styles.forceDesktop : ''} ${isMobile ? styles.mobileContainer : ''} ${isTablet ? styles.tabletContainer : ''}`} style={{ '--primary': botConfig.primaryColor }}>
      {isOpen ? (
        <div className={`${styles.chatWindow} ${isGlobal ? styles.globalChatWindow : ''}`}>
          <div className={styles.header}>
            <a 
              href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.realtypropflow.com'}/login`} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
              title="Dashboard Login"
            >
              <div className={styles.headerInfo}>
                <div className={styles.avatar}>
                  {botConfig.botAvatar && (botConfig.botAvatar.startsWith('http') || botConfig.botAvatar.startsWith('/')) ? (
                    <img src={botConfig.botAvatar} alt="Bot Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    botConfig.botAvatar
                  )}
                </div>
                <div>
                  <div className={styles.title}>{botConfig.botName}</div>
                  <div className={styles.status}>
                    {isHumanTakeover ? '🟡 Live Agent Connected' : '🟢 AI Online'}
                  </div>
                  {isDemoBot && embedPlan && (
                    <div style={{ marginTop: '2px', fontSize: '10px', background: embedPlan === 'premium' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.15)', color: embedPlan === 'premium' ? '#FDE047' : '#E2E8F0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {embedPlan === 'premium' ? '👑 Premium Plan' : '📦 Standard Plan'}
                    </div>
                  )}
                </div>
              </div>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                title="New Chat"
                onClick={resetChat}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  lineHeight: '1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >+</button>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
            </div>
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

                    {/* City Engagement Accordion Buttons */}
                    {msg.cityBtns && msg.cityBtns.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {msg.cityBtns.map((btn, bi) => {
                            const panelKey = `${idx}-${btn}`;
                            const isOpen = expandedCityPanel === panelKey;
                            const info = msg.cityInfoMap?.[btn];
                            return (
                              <div key={bi}>
                                <button
                                  onClick={() => setExpandedCityPanel(isOpen ? null : panelKey)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: isOpen ? '10px 10px 0 0' : '10px',
                                    border: `1.5px solid ${isOpen ? 'var(--primary)' : '#e5e7eb'}`,
                                    background: isOpen ? 'linear-gradient(90deg, var(--primary) 0%, #6366f1 100%)' : 'white',
                                    color: isOpen ? 'white' : '#374151',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    boxShadow: isOpen ? '0 2px 8px rgba(99,102,241,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                                    textAlign: 'left'
                                  }}
                                >
                                  <span>{btn}</span>
                                  <span style={{ fontSize: '11px', opacity: 0.8 }}>{isOpen ? '▲' : '▼'}</span>
                                </button>
                                {isOpen && (
                                  <div style={{
                                    background: '#f8faff',
                                    border: '1.5px solid var(--primary)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 10px 10px',
                                    padding: '12px 14px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    lineHeight: '1.7',
                                    animation: 'fadeIn 0.2s ease'
                                  }}>
                                    {info
                                      ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{info}</ReactMarkdown>
                                      : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Loading info for {btn}...</span>
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
          {botConfig.botAvatar && (botConfig.botAvatar.startsWith('http') || botConfig.botAvatar.startsWith('/')) ? (
            <div style={{ width: isMobile ? '40px' : '24px', height: isMobile ? '40px' : '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <img src={botConfig.botAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <span>{isMobile ? (botConfig.botAvatar || '💬') : (botConfig.botAvatar || '💬')}</span>
          )}
          {!isMobile && <span>Chat with us</span>}
        </button>
      )}
    </div>
  );
}

