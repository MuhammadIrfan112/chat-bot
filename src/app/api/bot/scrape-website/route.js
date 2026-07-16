import { supabase } from '@/lib/supabaseClient';
import * as cheerio from 'cheerio';

export async function POST(req) {
  try {
    const { url, bot_id } = await req.json();

    if (!url || !bot_id) {
      return Response.json({ error: 'URL and bot_id are required' }, { status: 400 });
    }

    const maxPages = 10; // Hard limit to prevent Vercel 15s timeout
    const visited = new Set();
    const toVisit = new Set();
    
    // Normalize base URL
    let baseUrlObj;
    try {
      baseUrlObj = new URL(url);
    } catch (e) {
      return Response.json({ error: 'Invalid URL provided' }, { status: 400 });
    }
    const origin = baseUrlObj.origin;

    toVisit.add(url);

    // 1. Fetch Main Page First
    const mainRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (RealtyPropFlow AI Crawler)' }, signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!mainRes || !mainRes.ok) {
      return Response.json({ error: 'Failed to access the website. Make sure the URL is public.' }, { status: 400 });
    }
    
    const mainHtml = await mainRes.text();
    visited.add(url);

    // 2. Extract Links and Content from Main Page
    const $ = cheerio.load(mainHtml);
    
    // Clean up unnecessary tags before extracting text
    $('script, style, noscript, iframe, img, svg, video, audio, nav, footer, header').remove();
    let combinedText = `--- PAGE: ${url} ---\n` + $('body').text().replace(/\s+/g, ' ').trim() + '\n\n';

    // Find internal links
    $('a').each((_, el) => {
      let href = $(el).attr('href');
      if (!href) return;
      
      // Clean href
      href = href.split('#')[0]; // Remove hash
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

      try {
        const linkUrl = new URL(href, origin);
        // Only crawl same domain
        if (linkUrl.origin === origin && !visited.has(linkUrl.href)) {
          toVisit.add(linkUrl.href);
        }
      } catch (e) {
        // Invalid URL
      }
    });

    // 3. Prepare Queue (Up to 9 additional pages)
    const queue = Array.from(toVisit).filter(u => !visited.has(u)).slice(0, maxPages - 1);

    // 4. Concurrently fetch subpages
    if (queue.length > 0) {
      const fetchPromises = queue.map(async (pageUrl) => {
        try {
          const res = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (RealtyPropFlow AI Crawler)' }, signal: AbortSignal.timeout(4000) });
          if (!res.ok) return null;
          const html = await res.text();
          
          const page$ = cheerio.load(html);
          page$('script, style, noscript, iframe, img, svg, video, audio, nav, footer, header').remove();
          return `--- PAGE: ${pageUrl} ---\n` + page$('body').text().replace(/\s+/g, ' ').trim();
        } catch (err) {
          return null; // Skip if timeout or error
        }
      });

      const results = await Promise.allSettled(fetchPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          combinedText += result.value + '\n\n';
        }
      });
    }

    // Ensure we don't exceed a massive size for Supabase text field
    // 1 million characters is roughly ~1MB of text, which is plenty.
    if (combinedText.length > 1000000) {
      combinedText = combinedText.substring(0, 1000000) + '\n...[Content truncated due to size limits]';
    }

    // 5. Insert into Supabase Knowledge Base
    const { error: insertError } = await supabase.from('knowledge_base').insert({
      bot_id: bot_id,
      content: combinedText,
    });

    if (insertError) throw insertError;

    return Response.json({ success: true, pagesScraped: 1 + queue.length });

  } catch (error) {
    console.error("Scraping Error:", error);
    return Response.json({ error: "Failed to scrape the website." }, { status: 500 });
  }
}

