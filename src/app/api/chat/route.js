import { supabase } from '@/lib/supabaseClient';
import * as cheerio from 'cheerio';

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
      ? `You are now in PROPERTY ASSISTANCE MODE.
   - When a user asks about properties or lists some requirements, kindly ask them for any missing key details (like Location, Budget, or Bedrooms) ONE AT A TIME in a conversational way.
   - Do NOT interrogate them. Keep the conversation flowing naturally.
   - Once you have a general idea of what they want, show the best matching property from your inventory with full details (image, address, beds, baths, price) and website link.`
      : isEcommerce
      ? `You are now in E-COMMERCE ASSISTANCE MODE.
   - When a user asks about a product, kindly ask them for any missing preferences (like Size, Color, or Budget) in a conversational way.
   - Do NOT interrogate them. Keep the conversation flowing naturally.
   - Once you have a general idea, show the best matching product from your inventory with full details (image, title, price) and website link.`
      : `   - Ask helpful questions about their specific needs in a friendly, conversational manner.\n   - Recommend the best matching item when appropriate.`;
    
    let systemInstruction = `You are an expert, professional AI Sales Consultant for ${botName}, representing the website: ${websiteUrl}.
Your ONLY goal is to help visitors find the right ${isRealEstate ? 'property' : 'product'} and convert them into qualified leads.

CRITICAL RULES:
1. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
2. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
3. ${isRealEstate ? `LEAD ASSISTANCE: Help the user find the right property by naturally asking about their preferences:
${qualifyingQuestions}` : `LEAD ASSISTANCE: Help the user find the right product by naturally asking about their preferences:
${qualifyingQuestions}`}
4. SMART FALLBACKS: If the user's exact requirements are not in inventory, your VERY FIRST sentence MUST explicitly state: "I apologize, but we don't have a ${isRealEstate ? 'property' : 'product'} that exactly matches all your requirements right now. However, here is the closest option available:" and then show the nearest match.
5. IMAGES: When showing a ${isRealEstate ? 'property' : 'product'}, ALWAYS include its image using markdown: ![Title](ImageURL).
6. LINKS: Always include the website URL (${websiteUrl}) for more details.
7. NEW SEARCHES: If the user explicitly asks to see "another ${isRealEstate ? 'house' : 'product'}" or "more options", BEFORE showing anything else, you MUST ask them: "Are your requirements still the same, or do you have a new ${isRealEstate ? 'location, budget, or size' : 'color, size, or budget'} in mind?"
8. Keep responses warm, friendly, concise. Use emojis occasionally.${knowledgeSection}${liveInventory}`;

    if (!bot_id) {
      systemInstruction = `You are a helpful AI Assistant. Your goal is to politely assist the user. Keep responses highly enthusiastic and concise.`;
    }

    // Convert format for Groq API
    const groqMessages = [
      { role: 'system', content: systemInstruction }
    ];

    messages.forEach(msg => {
      // Avoid leading model messages
      if (groqMessages.length === 1 && msg.role !== 'user') return;
      
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const text = msg.parts?.[0]?.text || '';
      
      const lastMsg = groqMessages[groqMessages.length - 1];
      if (lastMsg && lastMsg.role === role && role !== 'system') {
        lastMsg.content += `\n\n${text}`;
      } else {
        groqMessages.push({ role, content: text });
      }
    });

    if (groqMessages.length === 1) {
      groqMessages.push({ role: 'user', content: 'Hello' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Error: ${errText}`);
    }

    const data = await response.json();
    const replyText = data.choices[0].message.content;

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
