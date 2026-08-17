import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { bot_id } = await request.json();

    if (!bot_id) {
      return Response.json({ error: 'bot_id is required' }, { status: 400 });
    }

    // 1. Fetch website_url from bot profile
    const { data: botProfile, error: botErr } = await supabase
      .from('bots')
      .select('website_url')
      .eq('id', bot_id)
      .single();

    if (botErr || !botProfile?.website_url) {
      return Response.json({ error: 'Website URL not found for this chatbot. Please update your profile settings.' }, { status: 400 });
    }

    const websiteUrl = botProfile.website_url.trim();
    const baseUrl = new URL(websiteUrl).origin;

    console.log(`Starting crawl for ${websiteUrl}...`);

    // 2. Discover links on the main page
    const visited = new Set();
    const toVisit = [websiteUrl];
    const pagesToScrape = [];
    const MAX_PAGES = 5; // Limit to 5 pages to avoid Vercel timeouts

    while (toVisit.length > 0 && pagesToScrape.length < MAX_PAGES) {
      const currentUrl = toVisit.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const res = await fetch(currentUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });
        if (!res.ok) continue;

        const html = await res.text();
        pagesToScrape.push({ url: currentUrl, html });

        // Extract internal links
        const $ = cheerio.load(html);
        $('a').each((i, link) => {
          const href = $(link).attr('href');
          if (href) {
            try {
              const absUrl = new URL(href, baseUrl).href;
              // Only add internal links, try to prioritize property-related pages
              if (absUrl.startsWith(baseUrl) && !visited.has(absUrl)) {
                if (absUrl.toLowerCase().includes('listing') || absUrl.toLowerCase().includes('property') || absUrl.toLowerCase().includes('real-estate')) {
                  toVisit.unshift(absUrl); // prioritize these
                } else {
                  toVisit.push(absUrl);
                }
              }
            } catch (e) {
              // ignore invalid URLs
            }
          }
        });
      } catch (err) {
        console.error(`Failed to fetch ${currentUrl}:`, err);
      }
    }

    // 3. Process pages with OpenAI to extract properties
    const allProperties = [];
    const existingAddresses = new Set();

    for (const page of pagesToScrape) {
      console.log(`Sending text from ${page.url} to OpenAI...`);
      
      const cleanText = page.html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
        .replace(/(<([^>]+)>)/gi, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 30000);

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract real estate properties from the following webpage text.
Return a valid JSON object with an array called "properties".
For each property, try to extract:
- address: The full street address (required, string). Must not be empty.
- price: The numeric price (number). Strip out $, commas, etc.
- property_type: e.g. "Single Family", "Condo", "Townhouse" (string)
- bedrooms: number of bedrooms (number)
- bathrooms: number of bathrooms (number)
- square_feet: size in sqft (number)
- description: any short description available (string)

If no properties are found, return { "properties": [] }.`
            },
            {
              role: "user",
              content: cleanText
            }
          ],
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices[0].message.content);
        if (aiResult.properties && Array.isArray(aiResult.properties)) {
          for (const p of aiResult.properties) {
            if (p.address && !existingAddresses.has(p.address.toLowerCase())) {
              existingAddresses.add(p.address.toLowerCase());
              allProperties.push({ ...p, source_url: websiteUrl });
            }
          }
        }
      } catch (err) {
        console.error(`OpenAI parsing failed for ${page.url}:`, err);
      }
    }

    if (allProperties.length === 0) {
      return Response.json({ message: 'No properties found on the website.', added: 0, removed: 0 });
    }

    // 4. Update Database (Insert new, Delete removed)
    // Fetch current properties for this bot that were auto-scraped
    const { data: currentDbProps } = await supabase
      .from('properties')
      .select('property_id, address')
      .eq('bot_id', bot_id)
      .eq('source_url', websiteUrl);

    const currentDbAddresses = new Map();
    if (currentDbProps) {
      currentDbProps.forEach(p => {
        currentDbAddresses.set(p.address.toLowerCase(), p.property_id);
      });
    }

    let addedCount = 0;
    let removedCount = 0;

    // Insert new properties
    for (const prop of allProperties) {
      const addressKey = prop.address.toLowerCase();
      if (!currentDbAddresses.has(addressKey)) {
        // It's a new property, insert it
        const { error: insertError } = await supabase
          .from('properties')
          .insert([{
            bot_id,
            address: prop.address,
            price: prop.price || null,
            property_type: prop.property_type || null,
            bedrooms: prop.bedrooms || null,
            bathrooms: prop.bathrooms || null,
            square_feet: prop.square_feet || null,
            description: prop.description || null,
            source_url: websiteUrl
          }]);
        if (!insertError) {
          addedCount++;
        }
      } else {
        // It exists, we keep it. Remove from our Map so we don't delete it.
        currentDbAddresses.delete(addressKey);
      }
    }

    // Any addresses left in currentDbAddresses are no longer on the website, so we delete them
    for (const [address, property_id] of currentDbAddresses.entries()) {
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('property_id', property_id);
      if (!deleteError) {
        removedCount++;
      }
    }

    return Response.json({ 
      message: 'Website synced successfully!', 
      added: addedCount, 
      removed: removedCount 
    });

  } catch (error) {
    console.error('Properties scrape error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
