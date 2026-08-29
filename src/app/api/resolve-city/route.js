import OpenAI from "openai";

export const runtime = 'nodejs';
export const maxDuration = 10;

// In-memory cache for resolved cities
const RESOLVE_CACHE = new Map();

const COMMON_CITY_MAP = {
  // Canada
  milton: { city: 'Milton', state: 'ON', country: 'Canada' },
  toronto: { city: 'Toronto', state: 'ON', country: 'Canada' },
  mississauga: { city: 'Mississauga', state: 'ON', country: 'Canada' },
  brampton: { city: 'Brampton', state: 'ON', country: 'Canada' },
  oakville: { city: 'Oakville', state: 'ON', country: 'Canada' },
  burlington: { city: 'Burlington', state: 'ON', country: 'Canada' },
  hamilton: { city: 'Hamilton', state: 'ON', country: 'Canada' },
  vancouver: { city: 'Vancouver', state: 'BC', country: 'Canada' },
  calgary: { city: 'Calgary', state: 'AB', country: 'Canada' },
  edmonton: { city: 'Edmonton', state: 'AB', country: 'Canada' },
  ottawa: { city: 'Ottawa', state: 'ON', country: 'Canada' },
  // US
  'morton grove': { city: 'Morton Grove', state: 'IL', country: 'USA' },
  chicago: { city: 'Chicago', state: 'IL', country: 'USA' },
  skokie: { city: 'Skokie', state: 'IL', country: 'USA' },
  evanston: { city: 'Evanston', state: 'IL', country: 'USA' },
  naperville: { city: 'Naperville', state: 'IL', country: 'USA' },
  aurora: { city: 'Aurora', state: 'IL', country: 'USA' },
  'new york': { city: 'New York', state: 'NY', country: 'USA' },
  'los angeles': { city: 'Los Angeles', state: 'CA', country: 'USA' },
  miami: { city: 'Miami', state: 'FL', country: 'USA' },
  houston: { city: 'Houston', state: 'TX', country: 'USA' },
  dallas: { city: 'Dallas', state: 'TX', country: 'USA' },
  austin: { city: 'Austin', state: 'TX', country: 'USA' }
};

export async function POST(req) {
  try {
    const { query, state } = await req.json();
    if (!query || typeof query !== 'string') {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const clean = query.trim();
    const cacheKey = `${clean.toLowerCase()}_${(state || '').toLowerCase()}`;
    if (RESOLVE_CACHE.has(cacheKey)) {
      return Response.json({ success: true, ...RESOLVE_CACHE.get(cacheKey) });
    }

    // Check direct dictionary match
    const lower = clean.toLowerCase();
    if (COMMON_CITY_MAP[lower]) {
      const match = COMMON_CITY_MAP[lower];
      const result = {
        city: match.city,
        state: state ? state.toUpperCase() : match.state,
        country: match.country,
        formatted: `${match.city}, ${state ? state.toUpperCase() : match.state}`
      };
      RESOLVE_CACHE.set(cacheKey, result);
      return Response.json({ success: true, ...result });
    }

    // Call OpenAI to correct spelling mistakes, slang, abbreviations, or missing states
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      // Fallback: capitalize input
      const cap = clean.replace(/\b\w/g, l => l.toUpperCase());
      return Response.json({
        success: true,
        city: cap,
        state: state || '',
        formatted: state ? `${cap}, ${state.toUpperCase()}` : cap
      });
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content: "You are a real estate geographic entity resolver for North America (USA & Canada). Given any user query containing a city name (which may have typos, phonetic spellings, missing letters, or slang), resolve it to the exact official city and 2-letter state/province code. Return ONLY a JSON object: {\"city\": \"Exact City Name\", \"state\": \"2-letter state/province code\", \"country\": \"USA\" or \"Canada\"}. Example: \"mortn grov\" -> {\"city\": \"Morton Grove\", \"state\": \"IL\", \"country\": \"USA\"}. Example: \"miltn\" -> {\"city\": \"Milton\", \"state\": \"ON\", \"country\": \"Canada\"}. Return JSON only."
        },
        {
          role: "user",
          content: `Resolve city: "${clean}" ${state ? `(State hint: ${state})` : ''}`
        }
      ]
    });

    const reply = completion.choices[0]?.message?.content?.trim() || '';
    const parsed = JSON.parse(reply.replace(/```json|```/g, '').trim());

    if (parsed?.city) {
      const result = {
        city: parsed.city,
        state: parsed.state || state || '',
        country: parsed.country || '',
        formatted: parsed.state ? `${parsed.city}, ${parsed.state}` : parsed.city
      };
      RESOLVE_CACHE.set(cacheKey, result);
      return Response.json({ success: true, ...result });
    }

    // Fallback if parsing fails
    const cap = clean.replace(/\b\w/g, l => l.toUpperCase());
    return Response.json({
      success: true,
      city: cap,
      state: state || '',
      formatted: state ? `${cap}, ${state.toUpperCase()}` : cap
    });
  } catch (e) {
    console.error('[resolve-city] Error:', e.message);
    const clean = (req?.query || '').trim();
    const cap = clean.replace(/\b\w/g, l => l.toUpperCase());
    return Response.json({
      success: true,
      city: cap || 'Morton Grove',
      state: 'IL',
      formatted: cap ? `${cap}, IL` : 'Morton Grove, IL'
    });
  }
}
