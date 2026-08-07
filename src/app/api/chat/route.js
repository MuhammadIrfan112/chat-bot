import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as cheerio from 'cheerio';
import OpenAI from "openai";
import faqsData from '@/data/faqs.json';
import Fuse from 'fuse.js';

let fuseInstance = null;

function getRelevantFaqs(userQuery) {
  if (!faqsData || !Array.isArray(faqsData) || faqsData.length === 0) return '';
  if (!fuseInstance) {
    fuseInstance = new Fuse(faqsData, {
      keys: ['question', 'keywords', 'intent_name', 'category'],
      threshold: 0.5,
      includeScore: true
    });
  }
  const results = fuseInstance.search(userQuery);
  const topResults = results.slice(0, 4).map(r => `Q: ${r.item.question}\nA: ${r.item.answer}`);
  if (topResults.length > 0) {
    return "\n\nCLIENT APPROVED KNOWLEDGE BASE (Use these exact answers if relevant to the user's question. Do not invent answers if one of these matches):\n" + topResults.join('\n\n');
  }
  return '';
}

// Search properties from Supabase
async function getMatchingProperties(intent, propType, beds, maxBudget) {
  try {
    // Normalize intent to DB value
    const statusFilter = intent === 'rent' ? 'forRent' : intent === 'buy' ? 'forSale' : null;

    const buildQuery = (budgetLimit) => {
      let query = supabase
        .from('morton_grove_properties')
        .select('listing_status, home_type, address_full, price_amount, price_formatted, bedrooms, bathrooms, main_image, property_url')
        .not('main_image', 'is', null)
        .not('property_url', 'is', null)
        .limit(4);

      if (statusFilter) query = query.eq('listing_status', statusFilter);
      if (beds && beds > 0) query = query.eq('bedrooms', beds);
      if (budgetLimit && budgetLimit > 0) query = query.eq('price_amount', budgetLimit);
      if (propType) query = query.ilike('home_type', `%${propType}%`);
      
      return query;
    };

    // Try EXACT budget first
    let { data, error } = await buildQuery(maxBudget);

    // If no results, try 1.5% increased budget
    if (!data || data.length === 0) {
      const expandedBudget = maxBudget ? maxBudget + (maxBudget * 0.015) : null;
      let query = supabase
        .from('morton_grove_properties')
        .select('listing_status, home_type, address_full, price_amount, price_formatted, bedrooms, bathrooms, main_image, property_url')
        .not('main_image', 'is', null)
        .not('property_url', 'is', null)
        .limit(4);

      if (statusFilter) query = query.eq('listing_status', statusFilter);
      if (beds && beds > 0) query = query.eq('bedrooms', beds);
      if (propType) query = query.ilike('home_type', `%${propType}%`);
      if (expandedBudget && expandedBudget > 0) {
          // Find properties between exact budget and budget + 1.5%
          query = query.gt('price_amount', maxBudget).lte('price_amount', expandedBudget);
      }
      
      const res = await query;
      data = res.data;
      error = res.error;
    }

    if (error || !data || data.length === 0) {
        return "I'm sorry, but we currently don't have any properties that perfectly match your specific requirements and budget. However, our inventory updates frequently! If you are open to slightly adjusting your budget, bedroom requirements, or preferred locations, I can show you some excellent alternatives.";
    }

    const cards = data.map(p => {
      const status = p.listing_status === 'forRent' ? '🔵 For Rent' : '🟢 For Sale';
      return `[PROPERTY_CARD]
Status: ${status}
Type: ${p.home_type || 'Property'}
Address: ${p.address_full || 'Morton Grove, IL'}
Price: ${p.price_formatted || 'Contact for price'}
Beds: ${p.bedrooms || '?'} | Baths: ${p.bathrooms || '?'}
Image: ${p.main_image}
Link: ${p.property_url}
[/PROPERTY_CARD]`;
    });

    return cards.join('\n\n');
  } catch (e) {
    console.error('Property search error:', e);
    return null;
  }
}

// Start Apify Zillow scraper run (non-blocking) — returns runId immediately
async function startApifyRun(city, state, intent) {
  try {
    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_TOKEN) return null;

    const listingType = intent === 'rent' ? 'rentals' : 'homes';
    const citySlug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    
    // Build proper Zillow URL with searchQueryState (required by the actor)
    const isRent = intent === 'rent';
    const filterState = isRent
      ? { isForRent: { value: true }, isForSaleByOwner: { value: false }, isForSaleByAgent: { value: false } }
      : { isForSaleByOwner: { value: false }, isForSaleByAgent: { value: true } };

    const searchQueryState = JSON.stringify({
      pagination: {},
      isMapVisible: false,
      filterState,
      isListVisible: true,
      mapZoom: 11
    });

    const searchUrl = `https://www.zillow.com/${citySlug}/${listingType}/?searchQueryState=${encodeURIComponent(searchQueryState)}`;

    console.log(`[Apify] Starting async run with proper URL`);

    // Start run WITHOUT waitForFinish — returns immediately with runId
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchUrls: [{ url: searchUrl }],
          maxItems: 4,
          proxy: { useApifyProxy: true }
        })
      }
    );

    if (!runRes.ok) {
      console.error('[Apify] Failed to start run:', runRes.status);
      return null;
    }

    const runData = await runRes.json();
    const runId = runData?.data?.id;
    console.log(`[Apify] Run started: ${runId}`);
    return runId || null;
  } catch (e) {
    console.error('[Apify] Start error:', e.message);
    return null;
  }
}


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
    const { messages, session_id, bot_id, plan = 'premium' } = await req.json();

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
    // ── Demo Bot Fallback (demo-real-estate, demo-ecommerce) ───────────────
    if (bot_id && bot_id.startsWith('demo-')) {
      if (bot_id === 'demo-real-estate') {
        botName = 'Real Estate Bot';
        websiteUrl = 'https://real-state-23j6.vercel.app';
        isRealEstateEarly = true;
      } else if (bot_id === 'demo-ecommerce') {
        botName = 'NOVA Fashion';
        websiteUrl = 'https://nova-fashion-demo.vercel.app';
        isEcommerceEarly = true;
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
    
    let faqContext = '';
    if (isRealEstate) {
      faqContext = getRelevantFaqs(userQuery);
    }

    // --- Property Matching: Supabase first, Apify as fallback ---
    let propertyContext = '';
    let cityEngagementContext = '';
    let apifyRunId = null;

    if (isRealEstate) {
      const fullText = fullChatText.toLowerCase();
      let propIntent = null;
      if (fullText.includes('rent') || fullText.includes('rental') || fullText.includes('apartment') || fullText.includes('lease')) propIntent = 'rent';
      else if (fullText.includes('buy') || fullText.includes('purchase') || fullText.includes('for sale') || fullText.includes('buying')) propIntent = 'buy';

      // --- NEW LOGIC: Use AI structured summary as primary source of truth ---
      const recentSummary = [...messages].reverse().find(m => m.role === 'model' && (m.parts?.[0]?.text?.includes('Location:') || m.parts?.[0]?.text?.includes('To summarize')));
      let sumCity = null, sumState = null, sumBeds = 0, sumBudget = 0, sumType = null;
      if (recentSummary) {
        const sumText = recentSummary.parts[0].text;
        const locMatch = sumText.match(/Location:\s*([^,\n]+)(?:,\s*([^\n]+))?/i) || sumText.match(/in\s+([a-zA-Z\s]+),\s*([a-zA-Z\s]+)\b/i);
        if (locMatch && locMatch[1]) {
          sumCity = locMatch[1].trim().replace(/\[|\]/g, '');
          if (locMatch[2]) sumState = locMatch[2].trim().replace(/\[|\]/g, '');
        }
        const bedsMatch = sumText.match(/Bedrooms:\s*(\d+)/i) || sumText.match(/(\d+)-bedroom/i);
        if (bedsMatch) sumBeds = parseInt(bedsMatch[1]);
        
        const budMatch = sumText.match(/Maximum budget:\s*\$?([\d,]+)/i) || sumText.match(/budget(?:\s+of|:)?\s*\$?([\d,]+(?:k)?)/i);
        if (budMatch) {
          const raw = budMatch[1].replace(/,/g, '');
          sumBudget = raw.toLowerCase().endsWith('k') ? parseFloat(raw) * 1000 : parseInt(raw);
        }
        
        const typeMatch = sumText.match(/Property:\s*([^\n]+)/i);
        if (typeMatch) sumType = typeMatch[1].trim().toLowerCase();
      }

      // Extract property type (fallback)
      const typeMatch = fullText.match(/(apartment|condo|townhouse|house|single family|multi family)/i);
      const propType = sumType || (typeMatch ? typeMatch[1].toLowerCase() : null);

      // Extract bedrooms (fallback)
      const bedsMatch = fullText.match(/(\d)\s*(?:bed(?:room)?s?|br\b)/);
      const propBeds = sumBeds > 0 ? sumBeds : (bedsMatch ? parseInt(bedsMatch[1]) : 0);

      // Smart budget extractor (fallback)
      let propBudget = sumBudget > 0 ? sumBudget : 0;
      if (propBudget === 0) {
        const fullTextOrig = fullChatText; 
        const kMatch = fullTextOrig.match(/\$?([\d]+(?:\.[\d]+)?)\s*k\b/i);
        const plainMatch = fullTextOrig.match(/\$?([\d]{4,}|\d{1,3},\d{3})\s*(?:\/mo|per\s*month|month|budget|max|under)?/i);
        if (kMatch) propBudget = Math.round(parseFloat(kMatch[1]) * 1000);
        else if (plainMatch) propBudget = parseInt(plainMatch[1].replace(/,/g, ''));
      }

      if (propIntent === 'rent' && (propBudget > 50000 || (propBudget >= 2024 && propBudget <= 2030))) {
        propBudget = 0;
      }

      // Extract city from conversation — multiple patterns for robustness
      const stateAbbrs = 'al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|on|ab|bc|mb|nb|nl|ns|nt|nu|pe|qc|sk|yt|ontario|alberta|columbia|manitoba|brunswick|scotia|quebec|saskatchewan|texas|california|florida|york';
      const prefixPattern = new RegExp(`(?:in|near|at|for)\\s+([a-z][a-z\\s]{1,30}),?\\s*(${stateAbbrs})\\b`, 'g');
      const directPattern = new RegExp(`\\b([a-z][a-z\\s]{1,25}),\\s*(${stateAbbrs})\\b`, 'g');
      const genericCityPattern = new RegExp(`(?:in|near|at)\\s+([a-z][a-z\\s]{2,20})(?:\\s|$)`, 'g');

      const prefixMatches = [...fullText.matchAll(prefixPattern)];
      const directMatches = [...fullText.matchAll(directPattern)];
      const genericMatches = [...fullText.matchAll(genericCityPattern)];

      let detectedCity = sumCity;
      let detectedState = sumState;

      if (!detectedCity) {
        let lastMatch = null;
        if (prefixMatches.length > 0) {
          lastMatch = prefixMatches[prefixMatches.length - 1];
          detectedCity = lastMatch[1].trim().replace(/\s+/g, ' ');
          detectedState = lastMatch[2].toUpperCase();
        } else if (directMatches.length > 0) {
          lastMatch = directMatches[directMatches.length - 1];
          detectedCity = lastMatch[1].trim().replace(/\s+/g, ' ');
          detectedState = lastMatch[2].toUpperCase();
        } else if (genericMatches.length > 0) {
          detectedCity = genericMatches[genericMatches.length - 1][1].trim();
          detectedState = '';
        }
      }

      // Only trigger property search after user has provided city + budget + beds
      // AND has confirmed the summary with "yes"
      const lastUserMsg = userQuery.toLowerCase().trim();
      const hasConfirmedSummary = /(yes|yeah|correct|yep|sure|exactly)/i.test(lastUserMsg);
      // For demo bot: trigger if summary exists + confirmed (city is enough for fake props)
      const isDemoBot = bot_id === 'demo-real-estate';
      const hasEnoughInfo = isDemoBot
        ? (detectedCity || recentSummary) && hasConfirmedSummary
        : propIntent && detectedCity && propBeds > 0 && propBudget > 0;

      // DEBUG: log extracted values to Vercel logs
      console.log(`[PropertySearch] intent=${propIntent} city=${detectedCity} state=${detectedState} beds=${propBeds} budget=${propBudget} confirmed=${hasConfirmedSummary} enoughInfo=${hasEnoughInfo} lastMsg="${lastUserMsg}"`);

      if (hasEnoughInfo && hasConfirmedSummary) {
        const cityLower = (detectedCity || '').toLowerCase().trim();
        const isMortonGrove = cityLower === 'morton grove' || cityLower === '';

        let matchedProperties = null;
        if (isMortonGrove) {
          // Only query local DB if city is Morton Grove (or not set)
          matchedProperties = await getMatchingProperties(propIntent, propType, propBeds, propBudget);
        }

        if (plan === 'standard') {
          // Standard plan: NEVER search or show properties. Lead capture is triggered by system instruction.
          // No property context needed here.
        } else if (bot_id === 'demo-real-estate') {
          // Demo Premium: Generate fake properties that perfectly match the user's requirements
          const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
          const baseBudget = propBudget > 0 ? propBudget : 700000;
          
          matchedProperties = `
[PROPERTY_CARD]
ID: DEMO-101
Address: 123 Maple Street, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.95)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80
Features: Beautiful ${propType || 'home'} featuring a spacious layout, modern kitchen, and a large backyard.

[PROPERTY_CARD]
ID: DEMO-102
Address: 456 Oak Avenue, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.85)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80
Features: Stunning newly renovated ${propType || 'property'} with premium finishes, natural light, and close to excellent schools and parks.

[PROPERTY_CARD]
ID: DEMO-103
Address: 789 Pine Lane, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.90)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80
Features: Fantastic location with a beautiful open concept living space. Move-in ready and perfect for a growing family.

[PROPERTY_CARD]
ID: DEMO-104
Address: 321 Elm Drive, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.98)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80
Features: Custom built ${propType || 'home'} with luxury amenities, double car garage, and a gorgeous finished basement.

[PROPERTY_CARD]
ID: DEMO-105
Address: 555 Cedar Blvd, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.82)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80
Features: Amazing value! This beautiful property features hardwood floors throughout and a massive master bedroom suite.

[PROPERTY_CARD]
ID: DEMO-106
Address: 888 Birch Way, ${detectedCity || 'the city'}, ${detectedState || ''}
Price: ${formatPrice(baseBudget * 0.88)}
Specs: ${propBeds || 4} Beds, ${Math.max(1, (propBeds || 4) - 1)} Baths
Type: ${propType || 'Detached House'}
Image: https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80
Features: A rare find in this highly sought-after neighborhood! Features smart home technology and professional landscaping.
          `;
          propertyContext = `\n\nAVAILABLE PROPERTIES FROM DATABASE (Show these as property cards):\n${matchedProperties}\n\nCRITICAL INSTRUCTION: There are 6 properties available. You MUST show EXACTLY 4 properties in your immediate response. Do NOT show all 6. Save the remaining 2 properties in your memory. If the user replies asking to "show more", "see more", or "next", only then show the remaining 2 properties.`;
        } else if (matchedProperties && matchedProperties.includes('[PROPERTY_CARD]')) {
          // Found in database — show immediately
          propertyContext = `\n\nAVAILABLE PROPERTIES FROM DATABASE (Show these as property cards):\n${matchedProperties}`;
        } else if (detectedCity && !isMortonGrove) {
          // Different city — skip DB entirely, go straight to Apify
          console.log(`[Route] City is ${detectedCity} (not Morton Grove) — starting Apify run...`);
          apifyRunId = await startApifyRun(detectedCity, detectedState || 'IL', propIntent);

          if (apifyRunId) {
            // Tell AI to show city engagement while Apify processes in background
            cityEngagementContext = `\n\nCRITICAL OVERRIDE FOR STEP 11 AND STEP 12 (ACTIVE BACKGROUND SEARCH):
You are currently searching for properties in ${detectedCity}, ${detectedState || ''}. 
Because the search is running in the background, you MUST override Step 11 (Buy flow) AND Step 12 (Rent flow). DO NOT show any property cards yet.
Instead, reply EXACTLY with this:
"🔍 Searching for live properties in ${detectedCity}... This will take about 30 seconds. While you wait, explore what makes ${detectedCity} a great place to live! 🏙️"

Then show these city info buttons on a new line (use CITY_BTN tag, NOT BUTTON tag):
[CITY_BTN: 🏫 Schools] [CITY_BTN: 🌳 Parks] [CITY_BTN: 🚇 Transportation] [CITY_BTN: 🛒 Shopping & Dining] [CITY_BTN: 🏥 Healthcare] [CITY_BTN: 🏡 Neighborhood] [CITY_BTN: 🏘️ Housing Market] [CITY_BTN: 👥 Community] [CITY_BTN: 💡 Buyer Tips]

CRITICALLY IMPORTANT: Immediately below the buttons, you MUST output nine [CITY_INFO] tags with DETAILED, COMPREHENSIVE, REAL information about ${detectedCity}. Each section must be rich, professional, and formatted with real paragraphs — NOT bullet lists with literal \\n characters. Use proper spacing and full sentences.

FORMAT EXACTLY LIKE THIS (use real city-specific data, write in flowing professional sentences and paragraphs):
[CITY_INFO: 🏫 Schools | **Schools in ${detectedCity}** | ${detectedCity} offers a strong educational environment. The area is served by [School District Name], which includes well-regarded schools such as [Elementary 1] and [Elementary 2] at the primary level, [Middle School Name] for intermediate grades, and [High School Name] known for its [notable programs]. Private and charter options also exist for families seeking alternatives.]
[CITY_INFO: 🌳 Parks | **Parks & Outdoor Recreation in ${detectedCity}** | Residents of ${detectedCity} enjoy abundant green space. [Park Name 1] is a local favourite, offering [features]. [Park Name 2] provides trails, sports courts, and picnic areas. Cyclists and walkers can explore [trail name], and families frequent [playground/splash pad area] for year-round recreation.]
[CITY_INFO: 🚇 Transportation | **Getting Around ${detectedCity}** | ${detectedCity} is well connected for commuters. Public transit includes [bus routes/subway lines/GO Train if applicable]. Major highways such as [Highway names] provide quick access to [nearby city]. The nearest major airport is [Airport Name], approximately [X] minutes away. The area also has good walkability in the [neighbourhood/downtown area] and growing cycling infrastructure.]
[CITY_INFO: 🛒 Shopping & Dining | **Shopping & Dining in ${detectedCity}** | ${detectedCity} offers a diverse shopping and dining experience. Residents shop at [mall/plaza names] and major retailers like Walmart, Costco, and Whole Foods are nearby. The restaurant scene features [cuisine types] with popular spots in [area]. Local cafés, weekend farmers markets, and a vibrant nightlife scene add to the community's charm.]
[CITY_INFO: 🏥 Healthcare | **Healthcare in ${detectedCity}** | Healthcare access in ${detectedCity} is excellent. The area is served by [Hospital Name], a full-service medical centre, alongside several walk-in clinics and specialist offices. Major pharmacy chains including Shoppers Drug Mart and Rexall are conveniently located throughout the city. Residents also benefit from numerous gyms, wellness studios, and mental health services.]
[CITY_INFO: 🏡 Neighborhood | **Neighbourhood Character of ${detectedCity}** | ${detectedCity} is known for its [character — e.g., quiet, family-friendly, diverse, vibrant] atmosphere. The area attracts [typical resident profile — e.g., young families, professionals, retirees]. Streets are lined with [architectural styles — e.g., mature trees and detached homes / modern condos], and the community is generally regarded as safe and welcoming, with a strong sense of local identity.]
[CITY_INFO: 🏘️ Housing Market | **Housing Market in ${detectedCity}** | The housing market in ${detectedCity} is currently [buyer's/seller's] market. Detached homes average around [price range], while condos and townhouses range from [price range]. The market has been [trending up/stable] with growing demand from [buyer profile]. Rental demand remains strong, with average rents for [unit type] sitting around [rent range]. New developments in [area/neighbourhood] signal continued investment in the city.]
[CITY_INFO: 👥 Community | **Community Feel in ${detectedCity}** | ${detectedCity} has a vibrant and engaged community. Annual events such as [festival/market names] bring residents together. The city has an active network of neighbourhood associations, libraries, and cultural institutions including [examples]. Places of worship represent a diverse range of faiths, and volunteer and civic participation rates are high, reflecting a strong sense of community pride.]
[CITY_INFO: 💡 Buyer Tips | **What Buyers Should Know About ${detectedCity}** | Buyers are drawn to ${detectedCity} for its [top reasons — e.g., excellent schools, transit access, affordability relative to nearby cities]. It is best suited for [ideal buyer profile]. Key advantages include [pros]. Buyers should be aware of [honest consideration — e.g., competition in certain price ranges, limited inventory in specific neighbourhoods]. Pro tip: [insider advice specific to this city's market].]
`;
          } else {
            propertyContext = `\n\nCould not start property search for ${detectedCity}. Tell the user there was a temporary issue and to try again.`;
          }
        } else if (detectedCity && isMortonGrove) {
          // Morton Grove city but no DB match — try Apify
          console.log(`[Route] No DB results for Morton Grove — starting Apify run...`);
          apifyRunId = await startApifyRun(detectedCity, detectedState || 'IL', propIntent);
          if (apifyRunId) {
            cityEngagementContext = `\n\nCITY ENGAGEMENT RULE: Searching for live listings in ${detectedCity}. While results load, show city buttons:\n[BUTTON: 🏫 Schools >] [BUTTON: 🌳 Parks >] [BUTTON: 🚇 Transportation >]`;
          }
        } else if (matchedProperties) {
          // Fallback message (no city detected)
          propertyContext = `\n\n${matchedProperties}`;
        }
      }
    }

    const knowledgeSection = (knowledge || faqContext || propertyContext)
      ? `\n\nRELEVANT BUSINESS KNOWLEDGE:\n${knowledge || ''}\n${faqContext}${propertyContext}`
      : '';

    const qualifyingQuestions = isRealEstate
      ? `You are a professional real estate AI assistant representing ${botName}.
Your role is to welcome visitors, understand their real estate needs, provide helpful guidance, qualify opportunities, and connect serious prospects with the agent.

COMMUNICATION STYLE:
- Be friendly, professional, and conversational.
- Ask ONE question at a time. Never bundle multiple questions.
- Briefly acknowledge the user's input with enthusiasm before asking the next question. ⛔ CRITICAL: NEVER say "Great choice!" or "Great choice." Use "Great!", "Awesome!", or "Excellent!" instead.
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
IMPORTANT: If the user replies with ONLY the city name (e.g., "Toronto"), you MUST politely ask them which province or state it is in BEFORE moving to the next step. If they provide both the city and province/state, simply move to the next step without asking for confirmation.

Step 3a. Ask for bedrooms ONLY:
"How many bedrooms are you looking for?"

Step 3b. After getting bedrooms, ask for bathrooms ONLY:
"And how many bathrooms would you like?"

Step 4. Ask if they are a first-time buyer:
"Are you a first time buyer?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Ask about school requirements using MULTI_BUTTON tags (user can select multiple):
"Do you have any specific school requirements or preferences? (e.g. Elementary, Middle, High School)"
[MULTI_BUTTON: Elementary School] [MULTI_BUTTON: Middle School] [MULTI_BUTTON: High School]

Step 6. Ask about specific features using MULTI_BUTTON tags (user can select multiple):
"Are there any important features you're hoping for? You can select multiple options!"
[MULTI_BUTTON: Garage] [MULTI_BUTTON: Finished Basement] [MULTI_BUTTON: Swimming Pool] [MULTI_BUTTON: Backyard] [MULTI_BUTTON: New Construction]

Step 7. Ask for their budget:
"What is your budget?"

Step 8. Ask for timeline:
"Thanks! When are you planning to purchase?"
[BUTTON: Within 3 months] [BUTTON: In next 6 months] [BUTTON: Not decided]

Step 9. Ask for pre-approval status:
"Have you been pre-approved for a mortgage?"
[BUTTON: Yes] [BUTTON: No]

Step 9b. Ask about real estate agent:
"Are you currently working with any other real estate agent?"
[BUTTON: Yes] [BUTTON: No]

Step 10. Summarize and Confirm:
Once all information is collected (including agent status from Step 9b), you MUST generate a summary and ask for confirmation using EXACTLY this format:

Here's what I have for your home search:
Location: [City, State]
Property: [Property Type]
Bedrooms: [Bedrooms]
Bathrooms: [Bathrooms]
Important features: [Features]
School preference: [School]
Maximum budget: [Budget]
First-time buyer: [Yes/No]
Mortgage: [Pre-approved / Not pre-approved]
Purchase timeline: [Timeline]
Currently working with an agent: [Yes/No]

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]

Step 11. Post-Confirmation Action:
${plan === 'standard' ? 
`If the user confirms the information is correct in Step 10, DO NOT search for or show any properties.
Instead, respond with EXACTLY this message:
"Perfect! I've noted all your requirements. I'll search for properties that match your needs and get back to you as soon as possible."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]` 
: 
`If the user confirms the information is correct in Step 10, follow these rules STRICTLY in order:

**RULE A — IF you see AVAILABLE PROPERTIES FROM DATABASE in the prompt:**
Immediately show ONLY those exact property cards. Do NOT add, invent, or modify any details.
⛔ After showing properties, do NOT ask if they want to view more or capture a lead. The conversation continues naturally.

**RULE B — IF you see a CRITICAL OVERRIDE FOR STEP 11 or CRITICAL OVERRIDE FOR STEP 11 AND STEP 12 in the prompt:**
Follow it EXACTLY. This means properties are being fetched live. Show the searching message and ALL city engagement buttons (Schools, Parks, Transportation, Shopping, Dining, Healthcare, Community) with their CITY_INFO content. Do NOT show any properties yet. The properties will arrive automatically.

**RULE C — IF neither RULE A nor RULE B exist:**
Do NOT make up properties. Do NOT use general knowledge. Say exactly this:
"I'm sorry, I couldn't find any live properties matching your exact criteria right now. However, I've noted your requirements! Please provide your contact details below, and an agent will reach out to you as soon as a matching property becomes available."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]

⛔ ABSOLUTE PROHIBITION: NEVER generate, invent, or hallucinate property listings. If the data is not explicitly in this prompt, it does not exist.

If the user says "No" to the summary, ask them what information they would like to correct and update your understanding.

Step 12. Lead Capture:
If the user specifically asks to arrange a viewing, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]`}

DO NOT ask for their name, phone, or email manually. The [START_LEAD_CAPTURE] tag will automatically trigger the UI to collect their Name, Phone, Email, and Time Preference.

PATH 2 — RENTING A PROPERTY:
If the user is looking to rent a property, you MUST follow this exact 10-step flow strictly. Ask ONE question at a time.
Step 1. Identify Property Type:
"Are you looking to rent an apartment, condo, townhouse, or house?"
[BUTTON: Apartment] [BUTTON: Condo] [BUTTON: Townhouse] [BUTTON: House]

Step 2. Location (VERY IMPORTANT — ask this before other requirements):
"Which city or area are you looking to rent in? (Please mention city and state, e.g., 'Chicago, IL')"
IMPORTANT: If the user replies with ONLY the city name (e.g., "Chicago"), you MUST politely ask them which province or state it is in BEFORE moving to the next step. If they provide both the city and province/state, simply move to the next step without asking for confirmation.

Step 3. Bedrooms (ask ONLY bedrooms here):
"How many bedrooms do you need?"
[BUTTON: Studio] [BUTTON: 1 Bedroom] [BUTTON: 2 Bedrooms] [BUTTON: 3 Bedrooms] [BUTTON: 4+]

Step 4. Bathrooms (ask ONLY bathrooms here, separate from bedrooms):
"How many bathrooms do you need?"
[BUTTON: 1] [BUTTON: 2] [BUTTON: 3+]

Step 5. Occupants:
"Will anyone else be living with you?"

Step 6. Pets:
"Do you have any pets?"
[BUTTON: Yes] [BUTTON: No]

Step 7. Parking:
"Do you need parking?"
[BUTTON: Yes] [BUTTON: No]

Step 8. Must-have features:
"Are there any must-have features?"

Step 9. Budget:
"What is your maximum monthly budget for this rental?"

Step 10. Timeline:
"When are you thinking of moving in?"
[BUTTON: Immediately] [BUTTON: Next month] [BUTTON: In 2-3 months] [BUTTON: Not sure yet]

Step 11. Summarize and Confirm:
Once all information is collected, you MUST generate a summary and ask for confirmation using EXACTLY this format:

Here's what I have for your home search:
Location: [City, State]
Property: [Property Type]
Bedrooms: [Bedrooms]
Bathrooms: [Bathrooms]
Occupants: [Number]
Pets: [Yes/No]
Parking: [Yes/No]
Must-have features: [Features]
Maximum budget: [Budget]
Moving timeline: [Timeline]

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]

Step 12. Show Properties / Lead Capture:
CRITICAL RULE: DO NOT show properties until the user confirms the summary in Step 11.
If the user says "No", ask them what they would like to change.
${plan === 'standard' ?
`If the user confirms (says "Yes"), do NOT search for or show any properties.
Respond EXACTLY with:
"Perfect! I've noted your rental requirements. I'll find suitable properties and get back to you very soon."
Then immediately output:
[START_LEAD_CAPTURE]`
:
`If the user confirms (says "Yes"), follow these rules STRICTLY in order:

**RULE A — IF you see AVAILABLE PROPERTIES FROM DATABASE in the prompt:**
Immediately show ONLY those exact property cards. Do NOT add, invent, or modify any details.
⛔ After showing properties, do NOT ask if they want to view more or capture a lead.

**RULE B — IF you see a CRITICAL OVERRIDE FOR STEP 12 in the prompt:**
Follow it EXACTLY. Show the searching message and ALL city engagement buttons with CITY_INFO content. Do NOT show any properties yet.

**RULE C — IF neither RULE A nor RULE B exist:**
Do NOT make up properties. Say exactly this:
"I'm sorry, I couldn't find any live properties matching your exact criteria right now. However, I've noted your requirements! Please provide your contact details below, and an agent will reach out to you as soon as a matching property becomes available."
Then immediately reply ONLY with this hidden tag on the next line:
[START_LEAD_CAPTURE]

⛔ ABSOLUTE PROHIBITION: NEVER generate, invent, or hallucinate property listings.`}


PATH 3 — SELLING OR HOME VALUE:
If the user is looking to sell their property or wants a home valuation, you MUST follow this exact 9-step flow strictly. Ask ONE question at a time.
Step 1. Identify Seller Intent:
"I can help you understand your home's value and the selling process. Are you:"
[BUTTON: Planning to sell soon] [BUTTON: Thinking about selling in the future] [BUTTON: Just curious about my home's value] [BUTTON: Looking for general selling information]

Step 2. Understand Selling Timeline:
"When are you thinking about selling?"
[BUTTON: Immediately] [BUTTON: Within 1-3 months] [BUTTON: Within 3-6 months] [BUTTON: 6+ months] [BUTTON: Not sure yet]

Step 3. Property Address Collection:
"Got it! I can help estimate your home's current market value. May I have the full property address? (Please include the ZIP code and State if in the US, or Postal Code and Province if in Canada)."

Step 4a. Property Details - Bedrooms:
"To prepare a better estimate, can you tell me how many bedrooms your property has?"

Step 4b. Property Details - Bathrooms (Ask ONLY after getting bedrooms):
"And how many bathrooms?"

Step 4c. Property Details - Square Footage (Ask ONLY after getting bathrooms):
"What is the approximate square footage of your property?"

Step 4d. Property Details - Year Built (Ask ONLY after getting square footage):
"What year was your property built?"

Step 4e. Property Details - Upgrades (Ask ONLY after getting year built):
"Have there been any recent upgrades to your property?"
[BUTTON: Yes] [BUTTON: No]

Step 5. Seller Motivation:
"What is the main reason you are considering selling?"
[BUTTON: Moving to another home] [BUTTON: Relocating] [BUTTON: Downsizing] [BUTTON: Investment decision] [BUTTON: Financial reasons] [BUTTON: Life changes] [BUTTON: Just exploring options]

Step 6. Understand Current Situation:
"Are you currently living in the property?"
[BUTTON: Yes, my primary home] [BUTTON: It is a rental property] [BUTTON: It is vacant] [BUTTON: Other]

Step 7. Ask About Mortgage:
"Do you currently have a mortgage on the property?"
[BUTTON: Yes] [BUTTON: No] [BUTTON: Prefer not to answer]
If yes, ask: "Approximately how much do you still owe?"

Step 8. Seller Expectations:
"What is most important to you when selling?"
[BUTTON: Highest possible price] [BUTTON: Sell quickly] [BUTTON: Easy process] [BUTTON: Finding the right buyer] [BUTTON: Minimizing stress]

Step 9. Offer Value & Capture Lead:
"Based on the information you provided, I can help you understand:
✓ Estimated market value
✓ Recent comparable sales
✓ Selling timeline
✓ Preparation recommendations

Would you like a personalized home value report?"
[BUTTON: Yes, I want a report] [BUTTON: No, thank you]

If they say Yes to receiving a report or speaking with an agent, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]

PATH 4 — GENERAL EXPLORER:
If the user selects "General question" or is just exploring, follow this flow. Ask ONE question at a time.
Step 1. Understand Their Interest:
"That's a great place to start. Are you mainly interested in:"
[BUTTON: Understanding home prices] [BUTTON: Learning neighborhoods] [BUTTON: Seeing available properties] [BUTTON: Learning the buying process] [BUTTON: Understanding investment opportunities] [BUTTON: Just browsing]

Step 2. Educational Value:
Provide helpful information about their choice. Then ask: "Which area are you interested in?"

Step 3. Neighborhood/Needs Explorer:
"What matters most to you?"
[BUTTON: Good schools] [BUTTON: Short commute] [BUTTON: Affordable prices] [BUTTON: Luxury lifestyle] [BUTTON: Investment potential] [BUTTON: Restaurants and entertainment]

Step 4. Soft Qualification:
"To give you more useful information, are you exploring for:"
[BUTTON: Yourself] [BUTTON: Family member] [BUTTON: Investment] [BUTTON: Just curious]

Step 5. Determine Timeframe:
"How far ahead are you thinking?"
[BUTTON: Just researching] [BUTTON: Maybe within 6-12 months] [BUTTON: Within 3-6 months] [BUTTON: Within 90 days] [BUTTON: Not sure]

Step 6. Offer Useful Tools:
"Would you like access to:"
[BUTTON: Weekly market updates] [BUTTON: New property alerts] [BUTTON: Home buying checklist] [BUTTON: Neighborhood reports] [BUTTON: Home value updates]

Step 7. Capture Optional Contact:
If they want a tool or updates, politely ask for their Name and Email in the chat so you can send it to them. Do not use the [START_LEAD_CAPTURE] tag for this, unless they specifically ask to speak to an agent. Just say:
"I can send these updates to you. Would you like to receive them? If yes, please provide your Name and Email."

Step 8. Conversion Paths:
If their behavior signals they are actually a Buyer, Seller, or Investor, offer them a relevant service (e.g., personalized home search, free home estimate, or investment analysis) and if they accept, you can then output [START_LEAD_CAPTURE].

PATH 5 — INVESTING:
If the user wants to invest in real estate, you MUST follow this exact 12-step flow strictly. Ask ONE question at a time.
Step 1. Identify Investor Intent:
"Great! I can help you explore real estate investment opportunities. What type of investing are you interested in?"
[BUTTON: Rental properties] [BUTTON: Fix and flip] [BUTTON: Commercial properties] [BUTTON: Vacation rentals] [BUTTON: Land investment] [BUTTON: Real estate funds] [BUTTON: Not sure yet]

Step 2. Understand Investment Experience:
"How much experience do you have with real estate investing?"
[BUTTON: First-time investor] [BUTTON: I own 1-2 properties] [BUTTON: Experienced investor] [BUTTON: Professional investor]

Step 3. Investment Goal:
"What is your main investment goal?"
[BUTTON: Monthly cash flow] [BUTTON: Long-term appreciation] [BUTTON: Building wealth] [BUTTON: Tax benefits] [BUTTON: Diversifying investments] [BUTTON: Quick resale profit]

Step 4. Investment Location:
"Which markets are you interested in? (e.g. City, State, Neighborhood, or Open to recommendations)"

Step 5. Budget Qualification:
"What investment range are you considering?"
[BUTTON: Under $100,000] [BUTTON: $100,000-$250,000] [BUTTON: $250,000-$500,000] [BUTTON: $500,000-$1M] [BUTTON: $1M+] [BUTTON: Still exploring]

Step 6. Financing Method:
"How do you plan to purchase?"
[BUTTON: Cash purchase] [BUTTON: Mortgage financing] [BUTTON: Investment loan] [BUTTON: Partnership] [BUTTON: Not sure yet]

Step 7. Property Criteria:
"What type of property interests you?"
[BUTTON: Single-family home] [BUTTON: Multi-family property] [BUTTON: Condo] [BUTTON: Commercial property] [BUTTON: Land]
Then ask: "What matters most? (e.g., High rental income, Low maintenance, Growing area)"

Step 8 & 9. Investment Analysis:
If Rental Investor: Ask for numbers to evaluate cash flow (Purchase Price, Rent, Expenses) and offer analysis.
If Fix & Flip: Ask for numbers (Purchase price, Renovation cost, ARV) and say: "Would you like help analyzing a potential deal?"

Step 10. Risk Questions:
"What level of risk are you comfortable with?"
[BUTTON: Lower risk / stable income] [BUTTON: Moderate risk] [BUTTON: Higher return opportunities]

Step 11. Provide Investment Value:
"I can help you receive investment property alerts, rental market reports, and ROI analysis. Would you like to receive updates?"
[BUTTON: Yes, I want updates] [BUTTON: No, thank you]

Step 12. Capture Investor Lead:
If they want to receive updates or speak with an agent, reply ONLY with exactly this hidden tag:
[START_LEAD_CAPTURE]

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
   - For Step 5 (School requirements), you MUST append: \`[MULTI_BUTTON: Elementary School] [MULTI_BUTTON: Middle School] [MULTI_BUTTON: High School]\`
   - For Step 6 (Features), you MUST append: \`[BUTTON: Garage] [BUTTON: Finished Basement] [BUTTON: Swimming Pool]\`
   - For Step 8 (Timeline), you MUST append: \`[BUTTON: Within 3 months] [BUTTON: Within 6 months] [BUTTON: Not decided]\`
   - For Step 9 (Pre-approval), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 9b (Agent), you MUST append: \`[BUTTON: Yes] [BUTTON: No]\`
   - For Step 11 (Interest), you MUST append: \`[BUTTON: Yes, I liked one] [BUTTON: No, show more]\`
   NEVER omit these buttons when asking these specific questions.

3. TYPO TOLERANCE: Users may write with spelling mistakes or broken English. You MUST intelligently understand what they mean and respond naturally. NEVER ask them to rephrase.
3. STRICT TOPIC: Only answer about this business. Refuse all general knowledge, coding, math, or personal questions.
4. LEAD ASSISTANCE: 
${qualifyingQuestions}
5. SMART FALLBACKS: If the user asks for something not available, politely state: "I apologize, but we don't have exactly what you're looking for right now. However, here is the closest option:" and suggest the best match from the actual inventory.
6. RESPONSE STYLE: Keep responses short, engaging, and scannable. Use occasional emojis. Use line breaks so it looks clean on mobile. ⛔ NEVER say "Great choice!" anywhere in any response. If you want to acknowledge a good selection, use ONLY "Great!" or "Awesome!" instead.
${isRealEstate || isEcommerce ? `7. IMAGES & LINKS: When showing an item from the inventory, you MUST copy and use the EXACT markdown for Image and Link provided in the inventory data.\n8. WEBSITE LINK: You can also include the general website URL (${websiteUrl}) for more details if needed.` : `7. LINKS: Always include the website URL (${websiteUrl}) for more details.`}
${knowledgeSection}${liveInventory}
${cityEngagementContext}`;
    if (!bot_id) {
      systemInstruction = `You are an AI Sales Consultant for RealtyPropFlow AI. Your goal is to politely assist the user. Keep responses highly enthusiastic and concise.
      
CRITICAL RULES:
1. DIRECT ANSWERS: Always answer the user's question directly. NEVER just tell them to "check the pricing page" or "contact sales".
2. PRICING & PLANS: RealtyPropFlow AI has two main plans:
   - Standard Plan ($49/month): Includes AI Chatbot, 24/7 Lead Capture, Custom Knowledge Base, and Live Human Takeover. (Note: This plan captures leads but does NOT show properties).
   - Premium Plan ($79/month): Includes everything in Standard PLUS Live Property Showing, MLS/Database Integration, and advanced analytics.
3. FEATURES: 
   - Lightning Fast Setup (under 10 minutes)
   - Works on any website (WordPress, Shopify, custom, etc.)
   - Live Human Takeover: Pause the AI and talk to the prospect yourself.
   - 24/7 Lead Capture straight to the CRM dashboard.
4. LINKS: Link to https://www.realtypropflow.com/pricing for more details, or tell them they can sign up at https://www.realtypropflow.com/login.`;
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

      // ── STEP 1: Extract bedrooms & bathrooms from chat history ──────────
      const lcChat = fullChatText.toLowerCase();
      const bathsMatch = lcChat.match(/(\d+)\s*(?:bath|bathroom|baths)/);
      const bathsNeeded = bathsMatch ? parseInt(bathsMatch[1]) : 0;

      // ── STEP 2: Extract budget (supports $700k, $700,000, $4m, $4.5m etc.) ─
      // IMPORTANT: Dollar sign required for 'm' shorthand to avoid matching "3 months" as $3M
      let maxBudget = 0;
      const budgetMillionMatch = fullChatText.match(/\$([\d.]+)\s*m(?:illion)?\b/i);  // requires $
      const budgetKMatch = fullChatText.match(/\$([\d.]+)\s*k\b/i);                   // requires $
      const budgetPlainMatch = fullChatText.match(/\$\s*([\d,]{4,})/);                // $700,000 or $700000
      if (budgetMillionMatch) {
        maxBudget = Math.round(parseFloat(budgetMillionMatch[1]) * 1000000);
      } else if (budgetKMatch) {
        maxBudget = Math.round(parseFloat(budgetKMatch[1]) * 1000);
      } else if (budgetPlainMatch) {
        maxBudget = parseInt(budgetPlainMatch[1].replace(/,/g, ''));
      }
      console.log("Parsed maxBudget:", maxBudget, "| bedsMatch:", bedsMatch, "| bathsNeeded:", bathsNeeded);

      // ── STEP 3: City strict filter ──────────────────────────────────────
      if (cityMatch) {
        const strictCity = allCarouselProps.filter(p =>
          String(p.city || '').toLowerCase().includes(cityMatch.toLowerCase())
        );
        if (strictCity.length > 0) allCarouselProps = strictCity;
      }

      // ── STEP 4: Bedroom filter ──────────────────────────────────────────
      if (bedsMatch > 0) {
        const bFiltered = allCarouselProps.filter(p => parseInt(p.bedrooms) >= bedsMatch);
        if (bFiltered.length > 0) allCarouselProps = bFiltered;
      }

      // ── STEP 5: Bathroom filter ─────────────────────────────────────────
      if (bathsNeeded > 0) {
        const bathFiltered = allCarouselProps.filter(p => parseInt(p.bathrooms) >= bathsNeeded);
        if (bathFiltered.length > 0) allCarouselProps = bathFiltered;
      }

      // ── STEP 6: Smart Budget Filter (exact → +1.5% buffer → professional sorry) ──
      const NEEDS_BUDGET_FILTER = maxBudget > 10000;
      let finalProps = [];

      if (NEEDS_BUDGET_FILTER) {
        // Pass 1: Exact budget
        const exactFit = allCarouselProps.filter(item => {
          const priceNum = parseInt(String(item.price || '').replace(/[^0-9]/g, ''));
          return priceNum > 0 && priceNum <= maxBudget;
        });

        if (exactFit.length >= 1) {
          finalProps = exactFit.slice(0, 4);
          console.log("Pass 1 (exact budget) found:", finalProps.length);
        } else {
          // Pass 2: Allow up to 1.5% overflow
          const buffer = Math.round(maxBudget * 0.015);
          const slightOverBudget = allCarouselProps.filter(item => {
            const priceNum = parseInt(String(item.price || '').replace(/[^0-9]/g, ''));
            return priceNum > 0 && priceNum <= maxBudget + buffer;
          });

          if (slightOverBudget.length >= 1) {
            finalProps = slightOverBudget.slice(0, 4);
            console.log("Pass 2 (+1.5% buffer) found:", finalProps.length);
          } else {
            finalProps = [];
            console.log("No properties found within budget range, sending professional sorry.");
          }
        }
      } else {
        // No budget mentioned — just show top 4 by city + beds + baths
        finalProps = allCarouselProps.slice(0, 4);
      }

      // ── STEP 7: Normalize and return ──────────────────────────────────
      if (finalProps.length > 0) {
        propertiesList = finalProps.map(p => ({
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
      } else if (NEEDS_BUDGET_FILTER) {
        replyText = `I'm sorry, but we currently don't have any listings that match your criteria — ${bedsMatch > 0 ? `${bedsMatch} bedrooms` : ''}${bathsNeeded > 0 ? `, ${bathsNeeded} bathrooms` : ''} in ${cityMatch || 'your area'} within a budget of $${maxBudget.toLocaleString()}.\n\nWould you like to explore properties with a slightly higher budget, a different city, or adjusted requirements? I'd be happy to help you find the perfect match! 🏡`;
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
      properties: propertiesList,
      apifyRunId: typeof apifyRunId !== 'undefined' ? apifyRunId : null
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

