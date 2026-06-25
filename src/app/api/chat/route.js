import { supabase } from '@/lib/supabaseClient';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function liveScrapeWebsite(url) {
  if (!url) return '';
  try {
    let targetUrl = url.trim();
    if (!targetUrl.endsWith('/')) targetUrl += '/';
    
    const items = [];
    const baseUrl = new URL(targetUrl).origin;
    const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

    const resolveImg = (img) => {
      if (!img) return '';
      if (img.startsWith('http')) return img;
      if (img.startsWith('//')) return 'https:' + img;
      if (img.startsWith('/')) return baseUrl + img;
      return baseDir + img;
    };

    // 1. SHOPIFY DIRECTORY CHECK
    try {
      const shopifyRes = await fetch(targetUrl + 'products.json?limit=20', { headers: { 'User-Agent': 'BotFlow-AI' }});
      if (shopifyRes.ok) {
        const shopifyData = await shopifyRes.json();
        if (shopifyData?.products?.length > 0) {
          shopifyData.products.forEach(p => {
            const title = p.title;
            const price = p.variants?.[0]?.price ? '$' + p.variants[0].price : '';
            const img = p.images?.[0]?.src || '';
            if (title) items.push({ type: 'Product', title, price, img: resolveImg(img) });
          });
        }
      }
    } catch(e) {}

    // 2. HTML SCRAPING (JSON-LD & DOM)
    if (items.length === 0) {
      const urlsToTry = [
        targetUrl + 'products.html',
        targetUrl + 'properties.html',
        targetUrl, 
        targetUrl + 'ecommerce/products.html',
        targetUrl + 'ecommerce/index.html'
      ];

      let html = '';
      let fetchedUrl = '';
      
      for (const u of urlsToTry) {
        try {
          const res = await fetch(u, { headers: { 'User-Agent': 'BotFlow-AI' }, next: { revalidate: 300 } });
          if (res.ok) {
            html = await res.text();
            fetchedUrl = u;
            // Stop if we find indicators of products/properties or if it's the root
            if (html.includes('product') || html.includes('property') || html.includes('application/ld+json')) break;
          }
        } catch(e) {}
      }

      if (html) {
        const $ = cheerio.load(html);

        // A. JSON-LD SCHEMA (Universal for WP, Wix, standard SEO)
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const jsonData = JSON.parse($(el).html());
            const processLd = (obj) => {
              if (!obj) return;
              if (obj['@type'] === 'Product' || obj['@type'] === 'RealEstateListing' || obj['@type'] === 'Offer') {
                const title = obj.name || obj.title || '';
                const price = obj.offers?.price ? (obj.offers?.priceCurrency || '$') + obj.offers.price : '';
                let img = '';
                if (typeof obj.image === 'string') img = obj.image;
                else if (Array.isArray(obj.image)) img = obj.image[0];
                else if (obj.image?.url) img = obj.image.url;
                
                if (title && !items.find(item => item.title === title)) {
                  items.push({ type: obj['@type'], title, price, img: resolveImg(img) });
                }
              }
            };
            if (Array.isArray(jsonData)) jsonData.forEach(processLd);
            else if (jsonData['@graph']) jsonData['@graph'].forEach(processLd);
            else processLd(jsonData);
          } catch(e) {}
        });

        // B. CUSTOM FALLBACKS (For our demo & generic classes)
        if (items.length === 0) {
          // Property Cards
          $('.property-card').each((i, el) => {
            const title = $(el).find('.property-title').text().trim();
            const price = $(el).find('.property-price').text().trim();
            const img = resolveImg($(el).find('.property-img').attr('src'));
            const specs = $(el).find('.property-specs').text().replace(/\s+/g, ' ').trim();
            if (title && !items.find(item => item.title === title)) items.push({ type: 'Property', title, price, img, specs });
          });

          // Product Cards
          $('.product-card').each((i, el) => {
            const title = $(el).find('.product-name').text().trim();
            const price = $(el).find('.product-price').text().trim();
            const img = resolveImg($(el).find('.product-img').attr('src'));
            if (title && !items.find(item => item.title === title)) items.push({ type: 'Product', title, price, img });
          });
        }
      }
    }

    if (items.length === 0) return '';

    let scrapedText = "\n\nLIVE WEBSITE INVENTORY (Use these to recommend to users. MUST include markdown images `![title](img_url)` when recommending an item):\n";
    items.slice(0, 20).forEach(item => {
      scrapedText += `- **${item.title}** | Price: ${item.price} | ImageURL: ${item.img} ${item.specs ? '| Details: ' + item.specs : ''}\n`;
    });

    return scrapedText;
  } catch (error) {
    console.error("Universal Scraping error:", error);
    return '';
  }
}

async function getRelevantKnowledge(userQuery, botId) {
  if (!botId) return '';
  try {
    const { data } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('bot_id', botId)
      .textSearch('content', userQuery.split(' ').slice(0, 5).join(' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);

    if (!data || data.length === 0) {
      const { data: fallback } = await supabase
        .from('knowledge_base')
        .select('content')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(3);
      return fallback ? fallback.map(d => d.content).join('\n---\n') : '';
    }
    return data.map(d => d.content).join('\n---\n');
  } catch (e) {
    return '';
  }
}

export async function POST(req) {
  try {
    const { messages, session_id, bot_id } = await req.json();

    let botName = 'AI Assistant';
    let websiteUrl = 'this website';
    let calendlyLink = '';
    let liveInventory = '';

    if (bot_id) {
      const { data: bot } = await supabase.from('bots').select('*').eq('id', bot_id).single();
      if (bot) {
        botName = bot.name;
        websiteUrl = bot.website_url;
        calendlyLink = bot.calendly_link || '';
        
        // Detect industry from bot name
        const botNameLower = bot.name.toLowerCase();
        const isRealEstate = botNameLower.includes('real estate') || botNameLower.includes('realty') || botNameLower.includes('property') || botNameLower.includes('luxe');
        const isEcommerce = botNameLower.includes('shop') || botNameLower.includes('store') || botNameLower.includes('fashion') || botNameLower.includes('ecommerce');
        // Store for use in prompt
        if (bot) bot._industry = isRealEstate ? 'real_estate' : isEcommerce ? 'ecommerce' : 'general';

        if (bot.status !== 'Active') {
          return Response.json({ reply: "This chatbot is currently inactive. Please contact the website owner." });
        }

        const { data: subscription } = await supabase
          .from('users_subscription')
          .select('status, trial_ends_at')
          .eq('user_id', bot.user_id)
          .single();

        if (subscription && subscription.trial_ends_at) {
          const trialEnd = new Date(subscription.trial_ends_at);
          const now = new Date();
          if (now > trialEnd && subscription.status !== 'Active') {
            await supabase
              .from('users_subscription')
              .update({ status: 'Inactive' })
              .eq('user_id', bot.user_id);
            return Response.json({ reply: "⏰ Your 15-day free trial has ended. Please upgrade your plan to continue using this chatbot." });
          }
        }
        
        // 🔥 TRIGGER LIVE SCRAPING
        if (websiteUrl) {
          liveInventory = await liveScrapeWebsite(websiteUrl);
        }
      }
    }

    if (session_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('is_human_takeover')
        .eq('id', session_id)
        .single();

      if (session?.is_human_takeover) {
        const lastMsg = messages[messages.length - 1];
        await supabase.from('chat_messages').insert({
          session_id,
          role: 'user',
          content: lastMsg?.parts?.[0]?.text || ''
        });
        return Response.json({ reply: null, human_takeover: true });
      }
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage?.parts?.[0]?.text || '';
    
    const knowledge = await getRelevantKnowledge(userQuery, bot_id);

    const knowledgeSection = knowledge
      ? `\n\nRELEVANT BUSINESS KNOWLEDGE:\n${knowledge}`
      : '';

    // Build dynamic prompt based on bot industry
    let botData = null;
    if (bot_id) {
      const { data: b, error } = await supabase.from('bots').select('name, industry').eq('id', bot_id).single();
      if (error) {
        const { data: fallback } = await supabase.from('bots').select('name').eq('id', bot_id).single();
        botData = fallback;
      } else {
        botData = b;
      }
    }
    
    // Determine industry from database column, fallback to Real Estate if missing
    const botIndustry = botData?.industry || 'Real Estate';
    const isEcommerce = botIndustry === 'E-Commerce';
    const isRealEstate = !isEcommerce; // Default all others to Real Estate
    
    const qualifyingQuestions = isRealEstate
      ? `You are now in PROPERTY QUALIFICATION MODE. Follow this process STRICTLY:
   STEP 1: The user will provide their requirements (Location, Bedrooms, Bathrooms, Size, Budget).
   STEP 2: Review their message. If ANY of these 5 requirements are missing, ask them specifically for the missing information in a friendly way.
   STEP 3: ONLY AFTER you have collected ALL 5 requirements (Location, Bedrooms, Bathrooms, Size, Budget), show the best matching property from your inventory with full details (image, address, beds, baths, size, price) and website link.
   
   ABSOLUTE RULE: Never show a property if you do not have all 5 requirements. If they provided 3, ask for the remaining 2.`
      : isEcommerce
      ? `   - The user will provide their requirements. Ensure you have: product type, size/color preference, and budget.
   - If any of these are missing, ask specifically for the missing details.
   - Only AFTER gathering all details, recommend the best matching product from inventory.`
      : `   - Ask 1-2 qualifying questions about their specific needs and budget\n   - Only AFTER gathering these details, recommend the best matching item.`;
    
    let systemInstruction = `You are an expert, professional AI Sales Consultant for ${botName}, representing the website: ${websiteUrl}.
Your ONLY goal is to help visitors find the right ${isRealEstate ? 'property' : 'product'} and convert them into qualified leads.

CRITICAL RULES:
1. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
2. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
3. ${isRealEstate ? `MANDATORY 5-STEP QUALIFICATION — THIS IS NON-NEGOTIABLE:
${qualifyingQuestions}` : `LEAD QUALIFICATION: If a user shows interest in buying or inquiring about a product, do NOT immediately show a product. Ask ONE qualifying question at a time:
${qualifyingQuestions}`}
4. SMART FALLBACKS: If the user's exact requirement is not in inventory, say "I'm sorry, we don't have an exact match, but here is the closest option:" and show the nearest match. NEVER say "I can't help".
5. IMAGES: When showing a ${isRealEstate ? 'property' : 'product'}, ALWAYS include its image using markdown: ![Title](ImageURL).
6. LINKS: Always include the website URL (${websiteUrl}) for more details.
7. Keep responses warm, friendly, concise. Use emojis occasionally.${knowledgeSection}${liveInventory}`;

    if (!bot_id) {
      systemInstruction = `You are the strict, professional AI Sales Assistant for BotFlow AI, a powerful AI Chatbot creation platform.\nYour ONLY goal is to convince website owners to use BotFlow AI to grow their business. Do not answer coding or general knowledge questions. Keep responses highly enthusiastic and concise.`;
    }

    // FIX CHAT HALTING BUG: Gemini API crashes if consecutive messages have the same role (e.g., user -> user or model -> model)
    // AND it also crashes if the conversation doesn't start with a 'user' message.
    const normalizedMessages = [];
    messages.forEach(msg => {
      // Skip leading model messages
      if (normalizedMessages.length === 0 && msg.role !== 'user') return;

      if (normalizedMessages.length === 0) {
        // Deep copy to avoid mutating state
        normalizedMessages.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
      } else {
        const last = normalizedMessages[normalizedMessages.length - 1];
        if (last.role === msg.role) {
          last.parts[0].text += `\n\n${msg.parts[0].text}`;
        } else {
          normalizedMessages.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
        }
      }
    });
    
    // If somehow empty (only had model messages), add a dummy user message to prevent crash
    if (normalizedMessages.length === 0) {
      normalizedMessages.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: normalizedMessages,
      config: { systemInstruction, temperature: 0.7 }
    });

    const replyText = response.text;

    if (session_id) {
      await supabase.from('chat_messages').insert([
        { session_id, role: 'user', content: userQuery },
        { session_id, role: 'model', content: replyText }
      ]);
    }

    return Response.json({ reply: replyText });
  } catch (error) {
    console.error("Chat API Error:", error);
    return Response.json({ error: error.message || "Failed to generate response." }, { status: 500 });
  }
}
