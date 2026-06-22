import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { websiteUrl } = await req.json();
    if (!websiteUrl) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    let hostname = '';
    try {
      hostname = new URL(websiteUrl.includes('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
      // Remove www. for accurate comparison
      hostname = hostname.replace(/^www\./, '');
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch all bots to check their hostnames (using service role to bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('bots')
      .select('website_url');

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check if any existing bot's hostname matches the requested hostname
    const exists = data.some(bot => {
      try {
        if (!bot.website_url) return false;
        let botHostname = new URL(bot.website_url.includes('http') ? bot.website_url : `https://${bot.website_url}`).hostname;
        botHostname = botHostname.replace(/^www\./, '');
        return botHostname === hostname;
      } catch (e) {
        return false;
      }
    });

    return NextResponse.json({ exists });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
