import { supabase } from '@/lib/supabaseClient';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Fetch Bot Details to customize the AI
    let botName = 'AI Assistant';
    let websiteUrl = 'this website';
    let calendlyLink = '';

    if (bot_id) {
      const { data: bot } = await supabase.from('bots').select('*').eq('id', bot_id).single();
      if (bot) {
        botName = bot.name;
        websiteUrl = bot.website_url;
        calendlyLink = bot.calendly_link || '';

        // Domain Lock Check (Basic Security)
        const origin = req.headers.get('origin') || req.headers.get('referer') || '';
        // Allow localhost for testing, otherwise check if origin matches website_url
        if (!origin.includes('localhost') && !origin.includes('netlify.app')) {
          try {
            const botDomain = new URL(websiteUrl).hostname;
            if (!origin.includes(botDomain)) {
              return Response.json({ reply: "This chatbot is not authorized to run on this domain. Please check your embed code." });
            }
          } catch (e) {
            // Ignore URL parsing errors
          }
        }
      }
    }

    // Check if human has taken over
    if (session_id) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('is_human_takeover')
        .eq('id', session_id)
        .single();

      if (session?.is_human_takeover) {
        // Save user message but don't generate AI reply
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
    
    // Fetch knowledge ONLY for this specific bot
    const knowledge = await getRelevantKnowledge(userQuery, bot_id);

    const knowledgeSection = knowledge
      ? `\n\nRELEVANT BUSINESS KNOWLEDGE (Use this strictly to answer questions):\n${knowledge}`
      : '';

    // DYNAMIC PROMPT based on the client's website
    let systemInstruction = `You are a helpful AI Assistant for ${botName}, representing the website: ${websiteUrl}.
Help visitors understand the services offered on this website, answer their questions, and qualify leads.
If the user asks for a meeting or call, and this link is available: ${calendlyLink}, provide the link.
Answer based strictly on the context of ${websiteUrl}. Do not invent pricing or services that are not mentioned in the knowledge base.
Keep responses concise, friendly, and helpful.${knowledgeSection}`;

    // If NO bot_id is provided, it means this is running on the main SaaS Landing Page!
    if (!bot_id) {
      systemInstruction = `You are the AI Sales Assistant for BotFlow AI, a powerful AI Chatbot creation platform.
Your goal is to convince website owners to use BotFlow AI to grow their business.
If they ask how to create a chatbot, explain this simple 3-step process:
1. Click 'Start Building for Free' to sign up for an account.
2. Go to 'My Chatbots' in the dashboard, click '+ Create New Bot', and enter your website URL.
3. Copy the generated embed code and paste it into your website. It takes less than 2 minutes!

Key selling points of BotFlow AI:
- Train the AI on your own business data (PDFs, FAQs).
- Capture leads automatically.
- Live human takeover (monitor and jump into chats).
- Built-in Calendar Booking.

Pricing:
- Monthly: $25/month
- 3 Months: $67.50 total (10% off, $22.50/month)
- 6 Months: $127.50 total (15% off, $21.25/month)
- 12 Months: $225 total (25% off, $18.75/month)

Keep your responses highly enthusiastic, professional, and concise. Convince them to sign up!`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages,
      config: { systemInstruction, temperature: 0.7 }
    });

    const replyText = response.text;

    // Save messages to DB for live chat visibility
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
