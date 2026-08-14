import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { bot_id, url } = await request.json();

    if (!bot_id || !url) {
      return Response.json({ error: 'bot_id and url are required' }, { status: 400 });
    }

    // 1. Fetch raw HTML from the URL
    console.log(`Fetching HTML from ${url}...`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.statusText}`);
    }

    const html = await res.text();

    // 2. Clean HTML to save tokens (remove scripts, styles, svgs)
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/(<([^>]+)>)/gi, ' ') // remove all HTML tags
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .slice(0, 30000); // Limit to 30,000 characters to fit in context window easily

    // 3. Ask OpenAI to extract properties
    console.log('Sending text to OpenAI for property extraction...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert real estate data extractor. 
Extract real estate properties from the following webpage text.
Return a valid JSON object with an array called "properties".
For each property, try to extract:
- address: The full street address (required, string). If you cannot find an address, skip it.
- price: The numeric price (number). Strip out $, commas, etc.
- property_type: e.g. "Single Family", "Condo", "Townhouse" (string)
- bedrooms: number of bedrooms (number)
- bathrooms: number of bathrooms (number)
- square_feet: size in sqft (number)
- description: any short description available (string)

Return ONLY valid JSON. Example:
{
  "properties": [
    {
      "address": "123 Main St, New York, NY",
      "price": 500000,
      "property_type": "Condo",
      "bedrooms": 2,
      "bathrooms": 2,
      "square_feet": 1200,
      "description": "Beautiful condo in downtown."
    }
  ]
}`
        },
        {
          role: "user",
          content: cleanText
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content);
    const properties = aiResult.properties || [];

    if (properties.length === 0) {
      return Response.json({ message: 'No properties found on this page.', added: 0, duplicates: 0 });
    }

    let addedCount = 0;
    let duplicateCount = 0;

    // 4. Save to Database (checking for duplicates)
    for (const prop of properties) {
      if (!prop.address) continue; // Safety check

      // Check for duplicate by exact address for this bot
      const { data: existing } = await supabase
        .from('properties')
        .select('property_id')
        .ilike('address', prop.address.trim())
        .eq('bot_id', bot_id)
        .single();

      if (existing) {
        duplicateCount++;
        continue; // Skip duplicate
      }

      // Insert new property
      const { error: insertError } = await supabase
        .from('properties')
        .insert([{
          bot_id,
          address: prop.address.trim(),
          price: prop.price || null,
          property_type: prop.property_type || 'Single Family',
          bedrooms: prop.bedrooms || null,
          bathrooms: prop.bathrooms || null,
          square_feet: prop.square_feet || null,
          description: prop.description || null,
          status: 'Active'
        }]);

      if (!insertError) {
        addedCount++;
      }
    }

    return Response.json({
      message: `Scraping complete! Found ${properties.length} properties.`,
      added: addedCount,
      duplicates: duplicateCount
    });

  } catch (error) {
    console.error('Scrape API Error:', error);
    return Response.json({ error: error.message || 'Failed to scrape properties' }, { status: 500 });
  }
}
