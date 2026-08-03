import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as cheerio from 'cheerio';
import OpenAI from "openai";

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

// 🏡 Fetch listings from city_property_data (Apify real data)
async function fetchCityPropertyData(botId, fullChatText) {
  try {
    const q = fullChatText.toLowerCase();

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
    let targetCity = agentCities.find(city => q.includes(city.split(',')[0].toLowerCase()));
    if (!targetCity) {
      const commonCities = ['milton', 'toronto', 'brampton', 'mississauga', 'oakville', 'hamilton', 'burlington'];
      targetCity = commonCities.find(city => q.includes(city));
    }

    // 3. Query city_property_data table (real Apify scraped data)
    let cityQuery = supabase.from('city_property_data').select('city, properties');
    if (targetCity) cityQuery = cityQuery.ilike('city', `%${targetCity}%`);
    const { data: cityRows, error: cityError } = await cityQuery.limit(5);

    console.log(`fetchCityPropertyData: city_property_data query. TargetCity: ${targetCity}. Rows: ${cityRows?.length || 0}. Error: ${cityError?.message || 'none'}`);

    // 4. Flatten all properties from matched rows
    let allProperties = [];
    if (!cityError && cityRows && cityRows.length > 0) {
      cityRows.forEach(row => {
        if (row.properties && Array.isArray(row.properties)) {
          allProperties = allProperties.concat(row.properties);
        }
      });
    }

    // 5. If city_property_data is empty, instruct AI to handle it gracefully
    if (allProperties.length === 0) {
      console.log(`fetchCityPropertyData: No Apify data found.`);
      return `\n\n--- REAL ESTATE DATABASE INVENTORY ---\nNo real properties found matching this query in the database. CRITICAL: Inform the user politely that no exact matches were found for their specific criteria in this city. Do NOT show any mock data or invent properties. Suggest they ask about a different city or change their requirements.\n`;
    }

    // 6. Filter by beds if user mentioned it
    const bedsMatch = q.match(/(\d+)\s*(?:bed|bedroom|br)/);
    const minBedrooms = bedsMatch ? parseInt(bedsMatch[1]) : 0;
    let filteredData = minBedrooms > 0
      ? allProperties.filter(item => parseInt(item.bedrooms) >= minBedrooms)
      : allProperties;
    if (filteredData.length === 0) filteredData = allProperties;

    // 7. Filter by budget if user mentioned it (e.g. $650,000 or 650k)
    const budgetMatch = q.match(/\$([\d,]+)(?:k)?/) || q.match(/(\d+)k(?:\s|$)/);
    let maxBudget = 0;
    if (budgetMatch) {
      const raw = budgetMatch[1].replace(/,/g, '');
      maxBudget = raw.endsWith('k') ? parseInt(raw) * 1000 : parseInt(raw);
      if (maxBudget < 10000) maxBudget = maxBudget * 1000; // handle "650k" style
    }
    if (maxBudget > 0) {
      const withinBudget = filteredData.filter(item => {
        const priceStr = String(item.price || '').replace(/[^0-9]/g, '');
        const priceNum = parseInt(priceStr);
        return priceNum > 0 && priceNum <= maxBudget;
      });
      if (withinBudget.length > 0) filteredData = withinBudget;
      else {
        // No properties within budget — tell AI to be honest
        return `\n\n--- REAL ESTATE DATABASE INVENTORY ---\nNo real properties found within the budget of $${maxBudget.toLocaleString()} in ${targetCity || 'this city'}. CRITICAL: Tell the user honestly that no properties matching their budget were found. DO NOT show over-budget properties. Suggest they increase their budget or ask about different areas. DO NOT invent any properties.\n`;
      }
    }

    // 8. Strict city filter - only show properties from the asked city
    if (targetCity) {
      const strictCity = filteredData.filter(item =>
        String(item.city || '').toLowerCase().includes(targetCity.split(',')[0].toLowerCase())
      );
      if (strictCity.length > 0) filteredData = strictCity;
    }

    console.log(`fetchCityPropertyData: Passing ${Math.min(filteredData.length, 8)} real Apify properties to AI.`);

    let section = `\n\n--- REAL ESTATE DATABASE INVENTORY ---\nCRITICAL: ONLY show properties from this exact list. DO NOT invent properties. Show real address, price, image using markdown \`![title](url)\`:\n`;

    filteredData.slice(0, 8).forEach((l, i) => {
      const addr = `${l.address || ''}, ${l.city || ''}, ${l.province || ''}`.replace(/^, | , /g, '').trim();
      const price = l.price || l.priceDisplay || 'Contact for Price';
      const beds = l.bedrooms || l.beds || 'N/A';
      const baths = l.bathrooms || l.baths || 'N/A';
      const type = l.property_type || l.propertyType || 'Property';
      const imgArr = l.images && l.images.length > 0 ? l.images : (l.image_url ? [l.image_url] : (l.imgSrc ? [l.imgSrc] : []));
      const mainImg = imgArr[0] || '';

      section += `\n${i + 1}. **${addr}**\n`;
      section += `   - Price: ${price}\n`;
      section += `   - Beds: ${beds} | Baths: ${baths} | Type: ${type}\n`;
      if (mainImg) section += `   - Image: ![${addr}](${mainImg})\n`;
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
    let isRealEstateEarly = false;
    let isEcommerceEarly = false;

    // Extract user query and full chat history
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userQuery = lastUserMessage?.parts?.[0]?.text || '';
    const fullChatText = messages.map(m => m.parts?.[0]?.text || '').join(' ');

    if (bot_id) {
      const { data: bot } = await supabase.from('bots').select('*').eq('id', bot_id).single();
      if (bot) {
        botName = bot.name;
        websiteUrl = bot.website_url;
        calendlyLink = bot.calendly_link || '';
        
        // Detect industry from DB first, then fallback to name detection
        const botIndustryEarly = bot.industry || '';
        const botNameLower = bot.name.toLowerCase();
        // Added 'real state' to cover user typos in bot naming
        isRealEstateEarly = botIndustryEarly === 'Real Estate' || botNameLower.includes('real estate') || botNameLower.includes('real state') || botNameLower.includes('realty') || botNameLower.includes('property') || botNameLower.includes('luxe');
        isEcommerceEarly = botIndustryEarly === 'E-Commerce' || botNameLower.includes('shop') || botNameLower.includes('store') || botNameLower.includes('fashion') || botNameLower.includes('ecommerce');

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
              liveInventory = `\n\n--- PRIMARY WEBSITE INVENTORY ---\n${websiteData}`;
            }
          }
          const cityListings = await fetchCityPropertyData(bot_id, fullChatText);
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
    const botNameL = botData?.name ? botData.name.toLowerCase() : '';
    const isEcommerce = botIndustry === 'E-Commerce' || botNameL.includes('shop') || botNameL.includes('store');
    const isRealEstate = botIndustry === 'Real Estate' || botNameL.includes('real estate') || botNameL.includes('real state') || botNameL.includes('realty') || botNameL.includes('property');
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

Step 2. Ask for preferred city/location AND province:
"Which city or area are you interested in? Please also mention the province or state (e.g., 'Milton, Ontario')."
Once the user provides a city, confirm it by saying: "Just to confirm — do you mean [City], [Province/State]?"
[BUTTON: Yes] [BUTTON: No, different city]

Step 3a. Ask for bedrooms ONLY:
"How many bedrooms are you looking for?"

Step 3b. After getting bedrooms, ask for bathrooms ONLY:
"And how many bathrooms would you like?"

Step 4. Ask if they are a first-time buyer:
"Are you a first time buyer?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Ask about school requirements:
"Do you have any specific school requirements or preferences?"
[BUTTON: Yes] [BUTTON: No]
CRITICAL: Whatever the user answers (Yes or No), DO NOT ask any follow-up school questions. Immediately move to Step 6.

Step 6. Ask about specific features using MULTI_BUTTON tags (user can select multiple):
"Are there any important features you're hoping for? You can select multiple options!"
[MULTI_BUTTON: Garage] [MULTI_BUTTON: Finished Basement] [MULTI_BUTTON: Swimming Pool] [MULTI_BUTTON: Backyard] [MULTI_BUTTON: New Construction]

Step 7. Ask for their budget:
"What is your maximum budget for this property?"

Step 8. Ask for timeline:
"When are you aiming to purchase by?"
[BUTTON: Within 3 months] [BUTTON: In next 6 months] [BUTTON: Not decided]

Step 9. Ask for pre-approval status:
"Have you been pre-approved for a mortgage?"
[BUTTON: Yes] [BUTTON: No]

Step 10. Summarize and Confirm:
Once all information is collected, you MUST generate a summary and ask for confirmation:
"To summarize, you're looking for a [X]-bedroom [Property Type] in [City] with a [Feature], with a budget of up to [Budget], and you're [Pre-approved Status] and aiming to purchase within [Timeline].

Is this information correct?"
[BUTTON: Yes] [BUTTON: No]

Step 11. Show Properties:
If the user confirms the information is correct (e.g. they select "Yes"), reply with a brief confirmation and immediately output this EXACT tag on a new line:
[SHOW_PROPERTIES_CAROUSEL:City:Beds]
(Replace City with the requested city name, and Beds with the requested bedroom count number. Example: [SHOW_PROPERTIES_CAROUSEL:Milton:3])
FAILURE TO OUTPUT THIS TAG WILL BREAK THE SYSTEM.

If the user says "No", ask them what information they would like to correct and update your understanding.

Step 12. Ask for interest (LEAD CAPTURE TRIGGER):
After outputting the carousel tag, ask:
"Did you like any of these properties? If yes, which one? If not, I can show you more options."
[BUTTON: Yes, I liked one] [BUTTON: No, show more]

If they say "No, show more" (or choose that option), DO NOT invent or hallucinate properties. Instead, politely inform them that you have shown the best matches for their current criteria, and ask if they would like to adjust their budget, search in a different area, or change their requirements (e.g. fewer bedrooms) to see more options.
If the user changes their budget, city, or bedroom requirements at any point, acknowledge the change and immediately output the [SHOW_PROPERTIES_CAROUSEL:City:Beds] tag again so the system can fetch new properties.
If they say "Yes, I liked one" (or choose that option), ask: "Which property did you like?" (unless they already specified it, e.g., "property 3" or "the first one").
Once they specify the property they like (e.g., "property 3", "the second one", "123 Main St"), reply ONLY with exactly this hidden tag:
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
1. ONE QUESTION AT A TIME: You MUST only ask ONE single question per turn. Never bundle or ask two questions in the same response. For example, if you ask for school requirements, wait for the response BEFORE asking for other features.
2. BUTTONS FOR PREDEFINED OPTIONS: Whenever you ask a question that has choices, you MUST append \`[BUTTON: Choice 1] [BUTTON: Choice 2]\` at the very end of your message. This is MANDATORY.
   - For Step 1 (Property type), you MUST append: \`[BUTTON: Family Home] [BUTTON: Investment Property]\`
   - For Step 4 (First-time buyer), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 5 (School requirements), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 6 (Features), you MUST append: \`[BUTTON: Garage] [BUTTON: Finished Basement] [BUTTON: Swimming Pool]\`
   - For Step 8 (Timeline), you MUST append: \`[BUTTON: Within 3 months] [BUTTON: In next 6 months] [BUTTON: Not decided]\`
   - For Step 9 (Pre-approval), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 11 (Interest), you MUST append: \`[BUTTON: Yes, I liked one] [BUTTON: No, show more]\`
   NEVER omit these buttons when asking these specific questions.

3. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
3. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
4. LEAD ASSISTANCE: 
${qualifyingQuestions}
5. SMART FALLBACKS: If the user asks for something not available, politely state: "I apologize, but we don't have exactly what you're looking for right now. However, here is the closest option:" and suggest the best match from the actual inventory.
6. RESPONSE STYLE: Keep responses short, engaging, and scannable. Use occasional emojis. Use line breaks so it looks clean on mobile.
${isRealEstate || isEcommerce ? `7. IMAGES & LINKS: When showing an item from the inventory, you MUST copy and use the EXACT markdown for Image and Link provided in the inventory data.\n8. WEBSITE LINK: You can also include the general website URL (${websiteUrl}) for more details if needed.` : `7. LINKS: Always include the website URL (${websiteUrl}) for more details.`}
${knowledgeSection}${liveInventory}`;

    if (!bot_id) {
      systemInstruction = `You are an AI Sales Consultant for RealtyPropFlow AI. Your goal is to politely assist the user. Keep responses highly enthusiastic and concise.
      
CRITICAL RULES:
1. DIRECT ANSWERS: Always answer the user's question directly. NEVER just tell them to "check the pricing page" or "contact sales".
2. RealtyPropFlow PRICING: RealtyPropFlow AI offers a 14-day Free Trial. Paid plans start at $29/month. Custom Enterprise plans are also available. 
3. FEATURES: AI Chatbots, Live Human Takeover, Lead Capture, Real Estate MLS Integration, Analytics.
4. LINKS: You can link to https://www.realtypropflow.com/pricing for more details.`;
    }

    // DEBUG: Log if inventory was successfully injected
    if (liveInventory) {
      console.log("✅ LIVE INVENTORY INJECTED INTO PROMPT! Length:", liveInventory.length);
    } else {
      console.log("❌ NO INVENTORY INJECTED (liveInventory is empty)");
    }

    // Setup OpenAI Client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openaiMessages = [
      { role: "system", content: systemInstruction }
    ];

    messages.forEach(msg => {
      // Translate Gemini history roles to OpenAI roles:
      // 'model' -> 'assistant', 'user' -> 'user'
      const role = msg.role === 'model' ? 'assistant' : 'user';
      let text = msg.parts?.[0]?.text || '';
      
      // Reconstruct buttons in history so OpenAI sees the correct assistant pattern
      if (role === 'assistant' && msg.quickReplies && msg.quickReplies.length > 0) {
        const buttonTags = msg.quickReplies.map(btn => `[BUTTON: ${btn}]`).join(' ');
        text = `${text} ${buttonTags}`;
      }
      
      openaiMessages.push({ role, content: text });
    });

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    let replyText = aiResponse.choices[0].message.content || '';
    let propertiesList = null;

    // Detect if AI triggered the properties carousel (or if it forgot but asked the question)
    const carouselMatch = replyText.match(/\[SHOW_PROPERTIES_CAROUSEL:\s*([^:]+?)\s*:\s*(\d+)[^\]]*\]/i);
    const forgotTagButAsked = replyText.includes("Did you like any of these properties");
    
    console.log("=== PROPERTIES CAROUSEL DEBUG ===");
    console.log("isRealEstateEarly:", isRealEstateEarly);
    console.log("carouselMatch:", !!carouselMatch);
    console.log("forgotTagButAsked:", forgotTagButAsked);

    if (carouselMatch || forgotTagButAsked) {
      let cityMatch = '';
      let bedsMatch = 0;
      
      if (carouselMatch) {
        cityMatch = carouselMatch[1].trim();
        bedsMatch = parseInt(carouselMatch[2]) || 0;
        // Remove tag from text
        replyText = replyText.replace(carouselMatch[0], '');
      } else {
        // Fallback: extract from chat history
        const lcChat = fullChatText.toLowerCase();
        const commonCities = ['milton', 'toronto', 'brampton', 'mississauga', 'oakville', 'hamilton', 'burlington', 'london'];
        cityMatch = commonCities.find(c => lcChat.includes(c)) || '';
        const bMatch = lcChat.match(/(\d+)\s*(?:bed|bedroom|br)/);
        bedsMatch = bMatch ? parseInt(bMatch[1]) : 0;
      }
      
      console.log("Extracted City:", cityMatch);
      console.log("Extracted Beds:", bedsMatch);

      // Fetch properties from city_property_data (real Apify data)
      let allCarouselProps = [];
      const { data: cityRows } = await supabase
        .from('city_property_data')
        .select('city, properties')
        .ilike('city', `%${cityMatch}%`)
        .limit(5);

      if (cityRows && cityRows.length > 0) {
        cityRows.forEach(row => {
          if (row.properties && Array.isArray(row.properties)) {
            allCarouselProps = allCarouselProps.concat(row.properties);
          }
        });
      }

      // Filter by bedrooms
      if (bedsMatch > 0) {
        const bFiltered = allCarouselProps.filter(p => parseInt(p.bedrooms) >= bedsMatch);
        if (bFiltered.length > 0) allCarouselProps = bFiltered;
      }

      // Filter by budget from chat history
      const budgetMatchCarousel = fullChatText.match(/\$([\d,]+)/) || fullChatText.match(/(\d{3,}),?(\d{3})/);
      if (budgetMatchCarousel) {
        const raw = budgetMatchCarousel[0].replace(/[^0-9]/g, '');
        const maxBudget = parseInt(raw);
        if (maxBudget > 10000) {
          const withinBudget = allCarouselProps.filter(item => {
            const priceNum = parseInt(String(item.price || '').replace(/[^0-9]/g, ''));
            return priceNum > 0 && priceNum <= maxBudget;
          });
          if (withinBudget.length > 0) allCarouselProps = withinBudget;
        }
      }

      // Strict city filter
      if (cityMatch) {
        const strictCity = allCarouselProps.filter(p =>
          String(p.city || '').toLowerCase().includes(cityMatch.toLowerCase())
        );
        if (strictCity.length > 0) allCarouselProps = strictCity;
      }

      // Normalize to expected format
      if (allCarouselProps.length > 0) {
        propertiesList = allCarouselProps.slice(0, 6).map(p => ({
          mls_number: p.mls_number || p.mlsNumber || '',
          price: p.price || 'Contact for Price',
          address: p.address || '',
          city: p.city || cityMatch,
          province: p.province || 'ON',
          bedrooms: p.bedrooms || 'N/A',
          bathrooms: p.bathrooms || 'N/A',
          property_type: p.property_type || p.propertyType || 'Residential',
          images: p.images && p.images.length > 0 ? p.images : [],
          image_url: (p.images && p.images[0]) || '',
          url: p.url || ''
        }));
      }
      console.log("Final propertiesList length:", propertiesList?.length || 0);
    }
    console.log("=================================");

    if (session_id) {
      await supabase.from('chat_messages').insert([
        { session_id, role: 'user', content: userQuery },
        { session_id, role: 'model', content: replyText }
      ]);
    }

    return Response.json({ 
      reply: replyText,
      properties: propertiesList
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // Handle OpenAI Quota / Rate Limit / Authentication Errors
    if (error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Rate limit')))) {
      return Response.json({ error: "⚠️ The AI service is currently receiving too many requests. Please wait a few seconds and try again." }, { status: 429 });
    }
    
    if (error.status === 401 || (error.message && error.message.includes('API key'))) {
      return Response.json({ error: "⚠️ Invalid AI credentials configured. Please contact the administrator." }, { status: 401 });
    }

    return Response.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
  }
}

