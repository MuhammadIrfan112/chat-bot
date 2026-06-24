import { supabase } from '@/lib/supabaseClient';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function liveScrapeWebsite(url) {
  if (!url) return '';
  try {
    let targetUrl = url.trim();
    if (!targetUrl.endsWith('/')) targetUrl += '/';
    
    // Attempt to find catalog pages
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
        const res = await fetch(u, { headers: { 'User-Agent': 'BotFlow-AI-Scraper' }, next: { revalidate: 300 } });
        if (res.ok) {
          html = await res.text();
          fetchedUrl = u;
          if (html.includes('product-card') || html.includes('property-card')) {
            break; // Found a catalog page
          }
        }
      } catch(e) {}
    }

    if (!html) return '';

    const $ = cheerio.load(html);
    const items = [];
    const baseUrl = new URL(fetchedUrl).origin;
    const baseDir = fetchedUrl.substring(0, fetchedUrl.lastIndexOf('/') + 1);

    const resolveImg = (img) => {
      if (!img) return '';
      if (img.startsWith('http')) return img;
      if (img.startsWith('/')) return baseUrl + img;
      return baseDir + img;
    };

    // Scrape Property Cards
    $('.property-card').each((i, el) => {
      const title = $(el).find('.property-title').text().trim();
      const price = $(el).find('.property-price').text().trim();
      const img = resolveImg($(el).find('.property-img').attr('src'));
      const specs = $(el).find('.property-specs').text().replace(/\s+/g, ' ').trim();
      if (title) items.push({ type: 'Property', title, price, img, specs });
    });

    // Scrape Product Cards
    $('.product-card').each((i, el) => {
      const title = $(el).find('.product-name').text().trim();
      const price = $(el).find('.product-price').text().trim();
      const img = resolveImg($(el).find('.product-img').attr('src'));
      if (title) items.push({ type: 'Product', title, price, img });
    });

    if (items.length === 0) return '';

    let scrapedText = "\n\nLIVE WEBSITE INVENTORY (Use these to recommend to users. MUST include markdown images `![title](img_url)` when recommending an item):\n";
    items.slice(0, 20).forEach(item => {
      scrapedText += `- **${item.title}** | Price: ${item.price} | ImageURL: ${item.img} ${item.specs ? '| Details: ' + item.specs : ''}\n`;
    });

    return scrapedText;
  } catch (error) {
    console.error("Scraping error:", error);
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

    let systemInstruction = `You are a strict, professional AI Sales Assistant for ${botName}, representing the website: ${websiteUrl}.
Your ONLY goal is to help visitors understand the services offered, recommend properties/products, and qualify leads.
If the user asks for a meeting, provide this link: ${calendlyLink}.

CRITICAL RULES:
1. You MUST NOT answer general knowledge, coding, math, or personal questions. 
2. Answer based strictly on the provided RELEVANT BUSINESS KNOWLEDGE and LIVE WEBSITE INVENTORY. Do not invent items.
3. When recommending a property or product from the inventory, you MUST include its image using standard markdown format: ![Item Title](ImageURL). 
4. Keep responses friendly, concise, and helpful.${knowledgeSection}${liveInventory}`;

    if (!bot_id) {
      systemInstruction = `You are the strict, professional AI Sales Assistant for BotFlow AI, a powerful AI Chatbot creation platform.
Your ONLY goal is to convince website owners to use BotFlow AI to grow their business. Do not answer coding or general knowledge questions. Keep responses highly enthusiastic and concise.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages,
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
    return Response.json({ error: "Failed to generate response." }, { status: 500 });
  }
}
