import { supabase } from '@/lib/supabaseClient';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      const shopifyRes = await fetch(targetUrl + 'products.json?limit=20', { headers: { 'User-Agent': 'RealtyPropFlow-AI' }});
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
          const res = await fetch(u, { headers: { 'User-Agent': 'RealtyPropFlow-AI' }, next: { revalidate: 300 } });
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

// 🏡 Fetch listings from Supabase city_property_data (instant — no external API call)
async function fetchCityPropertyData(botId, userQuery) {
  try {
    const q = userQuery.toLowerCase();

    // 1. Get bot's service cities from knowledge_base
    const { data: kbEntries } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('bot_id', botId)
      .eq('source', 'Agent Onboarding Profile')
      .limit(1);

    let agentCities = [];
    if (kbEntries && kbEntries.length > 0) {
      const match = kbEntries[0].content.match(/Service Cities:\s*(.+)/);
      if (match) {
        agentCities = match[1].split(',').map(c => c.trim().toLowerCase());
      }
    }

    // 2. Detect which city user is asking about
    // First try to match user query against agent's cities
    let targetCity = agentCities.find(city => q.includes(city.split(',')[0].toLowerCase()));
    // Fallback: use first agent city if no specific city mentioned
    if (!targetCity && agentCities.length > 0) targetCity = agentCities[0];
    if (!targetCity) return ''; // No city configured

    // 3. Read from city_property_data table (instant DB query)
    const { data: cityData } = await supabase
      .from('city_property_data')
      .select('properties, last_scraped_at')
      .eq('city', targetCity)
      .single();

    if (!cityData || !cityData.properties || cityData.properties.length === 0) {
      return '';
    }

    const rawData = cityData.properties;

    // 4. Filter by beds if user mentioned it
    const bedsMatch = q.match(/(\d+)\s*(?:bed|bedroom|br)/);
    const minBedrooms = bedsMatch ? parseInt(bedsMatch[1]) : 0;
    let filteredData = minBedrooms > 0
      ? rawData.filter(item => parseInt(item.bedrooms) >= minBedrooms)
      : rawData;
    if (filteredData.length === 0) filteredData = rawData;

    const scrapedDate = cityData.last_scraped_at ? new Date(cityData.last_scraped_at).toLocaleDateString() : 'Recently';

    let section = `\n\n--- SECONDARY FALLBACK INVENTORY (LIVE ZILLOW LISTINGS for ${targetCity}) ---\nData refreshed: ${scrapedDate}. CRITICAL INSTRUCTION: ONLY use these properties if you CANNOT find a matching property in the PRIMARY WEBSITE INVENTORY above. If you do use these, ALWAYS show them with images and details:\n`;

    filteredData.slice(0, 5).forEach((l, i) => {
      const addr = `${l.address || ''}, ${l.city || ''}, ${l.state || ''}`.replace(/^, | , /g, '').trim();
      const price = l.price ? '$' + Number(l.price).toLocaleString('en-US') : 'Price on Request';
      const beds = l.bedrooms || 'N/A';
      const baths = l.bathrooms || 'N/A';
      const sqft = l.livingArea || 'N/A';
      const img = l.imgSrc || l.responsivePhotos?.[0]?.mixedSources?.jpeg?.[0]?.url || '';
      const url = l.url || '';

      section += `\n${i + 1}. **${addr || 'Property ' + (i+1)}**\n`;
      section += `   - Price: ${price}\n`;
      section += `   - Beds: ${beds} | Baths: ${baths} | Size: ${sqft} sqft\n`;
      if (img) section += `   - Image: ![${addr}](${img})\n`;
      if (url) section += `   - Link: [View on Zillow](${url})\n`;
    });

    return section;
  } catch (err) {
    console.error('City property fetch error:', err);
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

    // Extract user query early so we can use it for Repliers search
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage?.parts?.[0]?.text || '';

    if (bot_id) {
      const { data: bot } = await supabase.from('bots').select('*').eq('id', bot_id).single();
      if (bot) {
        botName = bot.name;
        websiteUrl = bot.website_url;
        calendlyLink = bot.calendly_link || '';
        
        // Detect industry from DB first, then fallback to name detection
        const botIndustryEarly = bot.industry || '';
        const botNameLower = bot.name.toLowerCase();
        const isRealEstateEarly = botIndustryEarly === 'Real Estate' || botNameLower.includes('real estate') || botNameLower.includes('realty') || botNameLower.includes('property') || botNameLower.includes('luxe');
        const isEcommerceEarly = botIndustryEarly === 'E-Commerce' || botNameLower.includes('shop') || botNameLower.includes('store') || botNameLower.includes('fashion') || botNameLower.includes('ecommerce');

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
          
          if (subscription.status === 'Trialing' && now > trialEnd) {
            // Trial has expired, auto-update to Inactive to prevent further chats
            await supabase
              .from('users_subscription')
              .update({ status: 'Inactive' })
              .eq('user_id', bot.user_id);
              
            return Response.json({ reply: "This chatbot is currently paused. Please contact the website owner directly." });
          }
          
          if (subscription.status === 'Inactive') {
             return Response.json({ reply: "This chatbot is currently paused. Please contact the website owner directly." });
          }
        }
        
        // 🏡 Real Estate: Scrape website and fetch from city DB
        if (isRealEstateEarly) {
          if (websiteUrl) {
            const websiteData = await liveScrapeWebsite(websiteUrl);
            if (websiteData) {
              liveInventory = `\n\n--- PRIMARY WEBSITE INVENTORY (ALWAYS PRIORITIZE THIS DATA) ---\n${websiteData}`;
            }
          }
          const cityListings = await fetchCityPropertyData(bot_id, userQuery);
          if (cityListings) {
            liveInventory = (liveInventory || '') + cityListings;
          }
        }
        // 🛒 E-commerce: Use live scraping only
        if (!liveInventory && websiteUrl) {
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

    const knowledge = await getRelevantKnowledge(userQuery, bot_id);

    const knowledgeSection = knowledge
      ? `\n\nRELEVANT BUSINESS KNOWLEDGE:\n${knowledge}`
      : '';

    // Build dynamic prompt based on bot industry
    let botData = null;
    if (bot_id === 'demo-real-estate') {
      botData = { name: 'Real Estate Bot', industry: 'Real Estate' };
    } else if (bot_id === 'demo-ecommerce') {
      botData = { name: 'E-Commerce Bot', industry: 'E-Commerce' };
    } else if (bot_id) {
      const { data: b, error } = await supabase.from('bots').select('name, industry').eq('id', bot_id).single();
      if (error) {
        const { data: fallback } = await supabase.from('bots').select('name').eq('id', bot_id).single();
        botData = fallback;
      } else {
        botData = b;
      }
    }
    
    // Determine industry from database column
    const botIndustry = botData?.industry || 'Custom';
    const isEcommerce = botIndustry === 'E-Commerce';
    const isRealEstate = botIndustry === 'Real Estate';
    const isGeneral = !isEcommerce && !isRealEstate;
    
    const qualifyingQuestions = isRealEstate
      ? `You are a professional real estate AI assistant representing ${botName}.
Your role is to welcome visitors, understand their real estate needs, provide helpful guidance, qualify opportunities, and connect serious prospects with the agent.

COMMUNICATION STYLE:
- Be friendly, professional, and conversational.
- Ask ONE question at a time. Never bundle multiple questions.
- Briefly acknowledge the user's input with enthusiasm before asking the next question.
- Provide value before requesting personal information.
- Make the visitor feel helped, not pressured.
- Keep responses concise and easy to read on mobile.
- Use emojis occasionally.

FIRST OBJECTIVE — IDENTIFY VISITOR INTENT:
If the user hasn't selected an intent yet, ask:
"Hi! 👋 Welcome. I'd be happy to help with your real estate needs. What can I help you with today?"
Then offer options: Buying a home / Home value / Selling / Renting / General question.

PATH 1 — BUYING A HOME / REAL ESTATE:
You MUST follow this exact 10-step flow strictly. Do not skip steps. Ask ONE question at a time. Do not bundle questions.
When asking a question that has predefined options, append \`[BUTTON: Option 1] [BUTTON: Option 2]\` at the very end of your message to render clickable buttons in the UI.

Step 1. Ask what type of property they are looking for:
"Are you looking for a family home, a first home, or an investment property?"
[BUTTON: Family Home] [BUTTON: Investment Property]

Step 2. Ask for preferred city/location:
"Which city or area are you interested in?"

Step 3. Ask for bedrooms and bathrooms:
"How many bedrooms and bathrooms are you looking for?"

Step 4. Ask if they are a first-time buyer:
"Are you a first time buyer?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Ask about school requirements:
"Do you have any specific school requirements or preferences?"
[BUTTON: Yes] [BUTTON: No]

Step 6. Ask about specific features:
"Are there any other important features you're hoping for?"
[BUTTON: Garage] [BUTTON: Finished Basement] [BUTTON: Swimming Pool]

Step 7. Ask for their budget:
"What is your maximum budget for this property?"

Step 8. Ask for timeline:
"When are you aiming to purchase by?"

Step 9. Ask for pre-approval status:
"Have you been pre-approved for a mortgage?"
[BUTTON: Yes] [BUTTON: No]

Step 10. Summarize and show properties:
Once all information is collected, you MUST generate a summary like this:
"To summarize, you're looking for a [X]-bedroom [Property Type] in [City] with a [Feature], with a budget of up to [Budget], and you're [Pre-approved Status] and aiming to purchase within [Timeline]."
After the summary, say "Let me look up a few properties for you." and display 4-6 matching properties from the LIVE INVENTORY using markdown images.

Step 11. Ask for interest (LEAD CAPTURE TRIGGER):
After showing the properties, ask:
"Would you be interested in any one of the above properties?"
[BUTTON: Yes] [BUTTON: No]

If they say "No", ask "Would you like to see more?" [BUTTON: Yes] [BUTTON: No]. If they say Yes, show 3 more properties.
If they say "Yes" to being interested in a property, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]

DO NOT ask for their name, phone, or email manually. The [START_LEAD_CAPTURE] tag will automatically trigger the UI to collect their Name, Phone, Email, and Time Preference.

PATH 2 — OTHER REQUESTS (Home Value, Selling, Renting):
If they select something other than buying, provide helpful information and naturally collect their location, property type, and timeline. Once you have the basics, ask if they want to arrange a showing or a call, and if they say Yes, output [START_LEAD_CAPTURE].

LEAD CONVERSION RULES:
CRITICAL: Never ask "May I have your name/phone/email" yourself. ALWAYS use [START_LEAD_CAPTURE] when they agree to proceed.

LOCATION HANDLING:
If a city is ambiguous, confirm the province/state.

CRITICAL: DO NOT HALLUCINATE LISTINGS. Only show properties from the LIVE INVENTORY provided below. If no inventory matches, say the agent will find matching options.`
      : isEcommerce
      ? `You are now in E-COMMERCE ASSISTANCE MODE.
   - When a user asks about a product, kindly ask them for any missing preferences (like Size, Color, or Budget) in a conversational way.
   - Do NOT interrogate them. Keep the conversation flowing naturally.
   - Once you have a general idea, show the best matching product ONLY from the LIVE INVENTORY provided below.
   - CRITICAL: DO NOT invent or hallucinate products. If no matching product is provided in the LIVE INVENTORY, politely state you couldn't find a match right now.`
      : `   - Ask helpful questions about their specific needs in a friendly, conversational manner.\n   - Recommend the best matching item when appropriate.`;
    
let systemInstruction = `You are an expert, professional AI Sales Consultant for ${botName}, representing the website: ${websiteUrl}.
Your ONLY goal is to help visitors and convert them into qualified leads by providing excellent assistance.

CRITICAL RULES:
1. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
2. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
3. LEAD ASSISTANCE: 
${qualifyingQuestions}
4. SMART FALLBACKS: If the user asks for something not available, politely state: "I apologize, but we don't have exactly what you're looking for right now. However, here is the closest option:" and suggest the best match from the actual inventory.
5. RESPONSE STYLE: Keep responses short, engaging, and scannable. Use occasional emojis. Use line breaks so it looks clean on mobile.
${isRealEstate || isEcommerce ? `6. IMAGES & LINKS: When showing an item from the inventory, you MUST copy and use the EXACT markdown for Image and Link provided in the inventory data.\n7. WEBSITE LINK: You can also include the general website URL (${websiteUrl}) for more details if needed.` : `6. LINKS: Always include the website URL (${websiteUrl}) for more details.`}
${knowledgeSection}${liveInventory}`;

    if (!bot_id) {
      systemInstruction = `You are an AI Sales Consultant for RealtyPropFlow AI. Your goal is to politely assist the user. Keep responses highly enthusiastic and concise.
      
CRITICAL RULES:
1. DIRECT ANSWERS: Always answer the user's question directly. NEVER just tell them to "check the pricing page" or "contact sales".
2. RealtyPropFlow PRICING: RealtyPropFlow AI offers a 14-day Free Trial. Paid plans start at $29/month. Custom Enterprise plans are also available. 
3. FEATURES: AI Chatbots, Live Human Takeover, Lead Capture, Real Estate MLS Integration, Analytics.
4. LINKS: You can link to https://chatbot-flow.vercel.app/pricing for more details.`;
    }

    // Setup Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
    });

    const geminiHistory = [];
    
    messages.forEach(msg => {
      // Gemini expects role to be 'user' or 'model'
      const role = msg.role === 'model' ? 'model' : 'user';
      const text = msg.parts?.[0]?.text || '';
      
      // Skip leading model messages as Gemini strictly requires history to start with 'user'
      if (geminiHistory.length === 0 && role === 'model') return;
      
      const lastMsg = geminiHistory[geminiHistory.length - 1];
      if (lastMsg && lastMsg.role === role) {
        lastMsg.parts[0].text += `\n\n${text}`;
      } else {
        geminiHistory.push({ role, parts: [{ text }] });
      }
    });

    if (geminiHistory.length === 0) {
      geminiHistory.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    // Pop the last message to send as the new query, use the rest as history
    const latestUserMsg = geminiHistory.pop();

    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(latestUserMsg.parts[0].text);
    const replyText = result.response.text();

    if (session_id) {
      await supabase.from('chat_messages').insert([
        { session_id, role: 'user', content: userQuery },
        { session_id, role: 'model', content: replyText }
      ]);
    }

    return Response.json({ reply: replyText });
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // Handle Gemini Free Tier Quota / Rate Limit Error
    if (error.message && (error.message.includes('429 Too Many Requests') || error.message.includes('exceeded your current quota') || error.message.includes('Rate limit exceeded'))) {
      return Response.json({ error: "⚠️ The AI is currently receiving too many requests. Please wait a few seconds and try again." }, { status: 429 });
    }

    return Response.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
  }
}

