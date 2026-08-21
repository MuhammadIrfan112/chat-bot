import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Allow this API route to run for up to 5 minutes (300 seconds) on Vercel
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: parse city, state, zip from full address
function parseAddressDetails(addressStr) {
  if (!addressStr) return { city: '', state: '', zip_code: '' };
  const str = addressStr.trim();
  // Match: Street, City, ST 12345 or Street, City, ST
  const match = str.match(/,\s*([^,]+?),\s*([A-Za-z]{2})(?:\s+([0-9]{5}(?:-[0-9]{4})?|[A-Za-z][0-9][A-Za-z]\s*[0-9][A-Za-z][0-9]))?/i);
  if (match) {
    return {
      city: match[1].trim(),
      state: match[2].toUpperCase().trim(),
      zip_code: (match[3] || '').trim()
    };
  }
  const parts = str.split(',');
  if (parts.length >= 2) {
    return {
      city: parts[1].trim(),
      state: '',
      zip_code: ''
    };
  }
  return { city: '', state: '', zip_code: '' };
}

// Helper: extract valid absolute image URLs from an element
function extractImagesFromEl($, el, baseUrl) {
  const images = [];
  const isValidImg = (u) => {
    if (!u || typeof u !== 'string') return false;
    const lower = u.toLowerCase();
    if (lower.includes('.svg') || lower.includes('logo') || lower.includes('icon') || lower.includes('avatar') || lower.includes('pixel') || lower.includes('badge') || lower.includes('1x1') || lower.includes('facebook') || lower.includes('instagram') || lower.includes('twitter') || lower.includes('linkedin') || lower.includes('placeholder')) {
      return false;
    }
    return true;
  };

  $(el).find('img').each((_, img) => {
    const src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('data-original') || $(img).attr('data-highres') || $(img).attr('src');
    if (src) {
      try {
        const abs = new URL(src, baseUrl).href;
        if (isValidImg(abs) && !images.includes(abs)) images.push(abs);
      } catch (e) {}
    }
    // Also check srcset
    const srcset = $(img).attr('srcset') || $(img).attr('data-srcset');
    if (srcset) {
      try {
        const parts = srcset.split(',').map(s => s.trim().split(' ')[0]);
        const last = parts[parts.length - 1];
        if (last) {
          const abs = new URL(last, baseUrl).href;
          if (isValidImg(abs) && !images.includes(abs)) images.push(abs);
        }
      } catch (e) {}
    }
  });

  // Check background images in styles
  $(el).find('[style*="background"]').each((_, bgEl) => {
    const style = $(bgEl).attr('style') || '';
    const match = style.match(/url\(['"]?([^'"]+)['"]?\)/i);
    if (match && match[1]) {
      try {
        const abs = new URL(match[1], baseUrl).href;
        if (isValidImg(abs) && !images.includes(abs)) images.push(abs);
      } catch (e) {}
    }
  });

  return images;
}

export async function POST(request) {
  try {
    const { bot_id } = await request.json();

    if (!bot_id) {
      return Response.json({ error: 'bot_id is required' }, { status: 400 });
    }

    // 1. Fetch website_url from bot profile (check bots table first, then users_subscription as fallback)
    const { data: botProfile } = await supabase
      .from('bots')
      .select('website_url, user_id')
      .eq('id', bot_id)
      .single();

    let websiteUrl = botProfile?.website_url?.trim();

    // Fallback: check users_subscription table
    if (!websiteUrl && botProfile?.user_id) {
      const { data: subProfile } = await supabase
        .from('users_subscription')
        .select('website_url')
        .eq('user_id', botProfile.user_id)
        .single();
      websiteUrl = subProfile?.website_url?.trim();
    }

    if (!websiteUrl) {
      return Response.json({ error: 'Website URL not found for this chatbot. Please go to My Profile in the dashboard and save your website URL first.' }, { status: 400 });
    }
    const baseUrl = new URL(websiteUrl).origin;

    console.log(`[Scraper] Starting comprehensive crawl for ${websiteUrl}...`);

    // 2. Discover links with priority for listing pages, pagination, and detail pages
    const visited = new Set();
    const toVisit = [websiteUrl];
    const pagesToScrape = [];
    const MAX_PAGES = 30; // Visit up to 30 relevant pages per sync

    // Seed common real estate paths
    const commonPaths = [
      '/listings', '/properties', '/our-listings', '/featured-listings', 
      '/homes-for-sale', '/for-sale', '/rentals', '/search', '/inventory'
    ];
    commonPaths.forEach(p => {
      try {
        const u = new URL(p, baseUrl).href;
        if (!toVisit.includes(u)) toVisit.push(u);
      } catch (e) {}
    });

    while (toVisit.length > 0 && pagesToScrape.length < MAX_PAGES) {
      const currentUrl = toVisit.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const res = await fetch(currentUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        });
        if (!res.ok) continue;

        const html = await res.text();
        pagesToScrape.push({ url: currentUrl, html });

        // Extract internal links with smart priority
        const $ = cheerio.load(html);
        $('a').each((i, link) => {
          const href = $(link).attr('href');
          if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            try {
              const absUrl = new URL(href, baseUrl).href;
              if (absUrl.startsWith(baseUrl) && !visited.has(absUrl)) {
                const lowerUrl = absUrl.toLowerCase();
                const isPagination = lowerUrl.includes('page=') || lowerUrl.includes('/page/') || lowerUrl.includes('p=') || lowerUrl.includes('pg=') || lowerUrl.includes('start=');
                const isListing = lowerUrl.includes('listing') || lowerUrl.includes('property') || lowerUrl.includes('real-estate') || lowerUrl.includes('homes') || lowerUrl.includes('for-sale') || lowerUrl.includes('rental');

                if (isPagination || isListing) {
                  toVisit.unshift(absUrl); // high priority
                } else if (!lowerUrl.includes('privacy') && !lowerUrl.includes('terms') && !lowerUrl.includes('login')) {
                  toVisit.push(absUrl);
                }
              }
            } catch (e) {}
          }
        });

        // Also proactively generate pagination links if on a listing page
        if (currentUrl.toLowerCase().includes('listing') || currentUrl.toLowerCase().includes('propert') || currentUrl.toLowerCase().includes('search')) {
          for (let pNum = 2; pNum <= 5; pNum++) {
            const pageUrls = [
              `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}page=${pNum}`,
              `${currentUrl.replace(/\/$/, '')}/page/${pNum}/`,
              `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}p=${pNum}`
            ];
            pageUrls.forEach(pu => {
              try {
                const absPu = new URL(pu, baseUrl).href;
                if (!visited.has(absPu) && !toVisit.includes(absPu)) toVisit.push(absPu);
              } catch (e) {}
            });
          }
        }

      } catch (err) {
        console.error(`[Scraper] Failed to fetch ${currentUrl}:`, err.message);
      }
    }

    console.log(`[Scraper] Fetched ${pagesToScrape.length} pages. Extracting property cards and photos...`);

    // 3. Extract properties from cards/blocks with photos
    const allProperties = [];
    const existingAddresses = new Set();

    for (const page of pagesToScrape) {
      const $ = cheerio.load(page.html);

      // Collect all listing card blocks or entire page content with photo context
      const cardBlocks = [];
      const cardSelectors = [
        '.property-card', '.listing-card', '.property-item', '.listing-item',
        '.card-property', '.estate-item', '.property', '.listing', 'article',
        '[data-listing]', '[data-property]', '.home-card', '.mls-item', 'div[class*="property"]', 'div[class*="listing"]'
      ];

      $(cardSelectors.join(', ')).each((i, cardEl) => {
        const cardText = $(cardEl).text().replace(/\s+/g, ' ').trim();
        // Only consider if it contains price or bed or bath indicators
        if (cardText.length > 20 && (cardText.includes('$') || cardText.toLowerCase().includes('bed') || cardText.toLowerCase().includes('bath') || cardText.toLowerCase().includes('sqft') || cardText.toLowerCase().includes('sq ft'))) {
          const cardImgs = extractImagesFromEl($, cardEl, baseUrl);
          let link = $(cardEl).find('a').attr('href') || '';
          if (link) {
            try { link = new URL(link, baseUrl).href; } catch (e) {}
          }
          cardBlocks.push({
            text: cardText.slice(0, 1500),
            images: cardImgs.slice(0, 6),
            link
          });
        }
      });

      // Format payload for OpenAI
      let extractionPayload = '';
      if (cardBlocks.length > 0) {
        extractionPayload = cardBlocks.slice(0, 15).map((cb, idx) => `
[CARD ${idx + 1}]
Text: ${cb.text}
Images: ${cb.images.join(', ') || 'None'}
Link: ${cb.link || page.url}
[/CARD]
        `).join('\n\n');
      } else {
        // Fallback: full page text with all page images
        const pageImgs = extractImagesFromEl($, 'body', baseUrl).slice(0, 12);
        const cleanText = page.html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
          .replace(/(<([^>]+)>)/gi, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 25000);

        extractionPayload = `Page URL: ${page.url}\nPage Images: ${pageImgs.join(', ')}\n\nPage Text:\n${cleanText}`;
      }

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a real estate listing data extraction expert.
Extract all individual real estate properties from the provided webpage content.
Return a valid JSON object with an array named "properties".

For each property, extract:
- address: The full street address (e.g. "1444 W Barry Street, Chicago, IL 60657" or "123 Main St, Dallas, TX"). Required.
- city: City name (e.g. "Chicago", "Dallas", "Milton"). If not specified separately, extract it from the address.
- state: 2-letter state or province code (e.g. "IL", "TX", "ON", "FL"). Extract from address if needed.
- zip_code: ZIP or Postal code if present.
- price: Numeric price (number only, e.g. 850000 or 2500 for rent). Strip out $, commas, /mo.
- property_type: e.g. "Single Family", "Condo", "Townhouse", "Multi-Family", "Apartment", "Commercial".
- bedrooms: Number of bedrooms (number, e.g. 3).
- bathrooms: Number of bathrooms (number, e.g. 2 or 2.5).
- square_feet: Area in sqft (number).
- description: Short highlight or description.
- photos: Array of image URLs matching this specific property (from the provided Images list). Include all matching photo URLs.
- url: Link to the property listing page.

If no properties are found in this content, return { "properties": [] }.`
            },
            {
              role: "user",
              content: extractionPayload
            }
          ],
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices[0].message.content);
        if (aiResult.properties && Array.isArray(aiResult.properties)) {
          for (const p of aiResult.properties) {
            if (p.address && String(p.address).trim().length > 5) {
              const addrKey = p.address.toLowerCase().trim();
              if (!existingAddresses.has(addrKey)) {
                existingAddresses.add(addrKey);

                // Auto-fill city/state/zip if missing from address
                const parsedAddr = parseAddressDetails(p.address);
                const city = p.city?.trim() || parsedAddr.city || '';
                const state = p.state?.trim() || parsedAddr.state || '';
                const zip = p.zip_code?.trim() || parsedAddr.zip_code || '';

                // Photos array sanitation
                const photos = Array.isArray(p.photos) ? p.photos.filter(u => u && typeof u === 'string' && u.startsWith('http')) : [];

                allProperties.push({
                  address: p.address.trim(),
                  city,
                  state,
                  zip_code: zip,
                  price: p.price ? Number(p.price) : null,
                  property_type: p.property_type || 'Single Family',
                  bedrooms: p.bedrooms ? Number(p.bedrooms) : null,
                  bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
                  square_feet: p.square_feet ? Number(p.square_feet) : null,
                  description: p.description || null,
                  photos: photos,
                  url: p.url || page.url,
                  source_url: websiteUrl
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Scraper] AI parsing error on ${page.url}:`, err.message);
      }
    }

    console.log(`[Scraper] Successfully extracted ${allProperties.length} total unique properties.`);

    if (allProperties.length === 0) {
      return Response.json({ message: 'No properties found on the website.', added: 0, removed: 0 });
    }

    // 4. Update Database: Full 2-Way Sync (Insert New, Update Existing, Delete Removed)
    // Fetch all current properties in DB for this bot
    const { data: dbProps } = await supabase
      .from('properties')
      .select('property_id, address')
      .eq('bot_id', bot_id);

    const dbAddressesMap = new Map();
    if (dbProps && Array.isArray(dbProps)) {
      dbProps.forEach(p => {
        if (p.address) {
          dbAddressesMap.set(p.address.toLowerCase().trim(), p.property_id);
        }
      });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    for (const prop of allProperties) {
      const addrKey = prop.address.toLowerCase().trim();
      const existingPropId = dbAddressesMap.get(addrKey);

      if (existingPropId) {
        // 1. Property exists on website AND in DB -> Update with latest details & photos
        const { error: updErr } = await supabase
          .from('properties')
          .update({
            city: prop.city || null,
            state: prop.state || null,
            zip_code: prop.zip_code || null,
            price: prop.price || null,
            property_type: prop.property_type || null,
            bedrooms: prop.bedrooms || null,
            bathrooms: prop.bathrooms || null,
            square_feet: prop.square_feet || null,
            description: prop.description || null,
            photos: prop.photos || [],
            source_url: websiteUrl,
            status: 'Active',
            updated_at: new Date().toISOString()
          })
          .eq('property_id', existingPropId);

        if (!updErr) updatedCount++;
        // Remove from map so we know it's still alive on the website
        dbAddressesMap.delete(addrKey);
      } else {
        // 2. New property found on website -> Insert into DB
        const { error: insErr } = await supabase
          .from('properties')
          .insert([{
            bot_id,
            address: prop.address,
            city: prop.city || null,
            state: prop.state || null,
            zip_code: prop.zip_code || null,
            price: prop.price || null,
            property_type: prop.property_type || null,
            bedrooms: prop.bedrooms || null,
            bathrooms: prop.bathrooms || null,
            square_feet: prop.square_feet || null,
            description: prop.description || null,
            photos: prop.photos || [],
            source_url: websiteUrl,
            status: 'Active'
          }]);

        if (!insErr) addedCount++;
      }
    }

    // 3. Any properties left in dbAddressesMap were NOT found on the website anymore -> Delete them from DB
    for (const [address, property_id] of dbAddressesMap.entries()) {
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('property_id', property_id);

      if (!deleteError) {
        removedCount++;
      }
    }

    console.log(`[Scraper] Sync completed: Added=${addedCount}, Updated=${updatedCount}, Removed=${removedCount}, ActiveTotal=${allProperties.length}`);

    return Response.json({ 
      message: `Website synced successfully! Active listings: ${allProperties.length}.`, 
      added: addedCount, 
      updated: updatedCount,
      removed: removedCount,
      total: allProperties.length
    });

  } catch (error) {
    console.error('Properties scrape error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
