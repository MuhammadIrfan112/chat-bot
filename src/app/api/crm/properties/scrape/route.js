import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import * as cheerio from 'cheerio';

// Allow this API route to run for up to 5 minutes (300 seconds) on Vercel
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Helper: parse city, state, zip from full address
function parseAddressDetails(addressStr) {
  if (!addressStr) return { city: '', state: '', zip_code: '' };
  const str = addressStr.trim();
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
    return { city: parts[1].trim(), state: '', zip_code: '' };
  }
  return { city: '', state: '', zip_code: '' };
}

// Helper: fetch HTML safely
async function fetchHtml(url, timeout = 20000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`[Scraper] Fetch error for ${url}:`, e.message);
    return null;
  }
}

// Helper: extract valid real estate images
function extractImages($, el, baseUrl) {
  const imgs = [];
  const isValid = (u) => {
    if (!u || typeof u !== 'string') return false;
    const l = u.toLowerCase();
    if (l.includes('.svg') || l.includes('logo') || l.includes('icon') || l.includes('avatar') ||
        l.includes('pixel') || l.includes('badge') || l.includes('1x1') || l.includes('tracking') ||
        l.includes('facebook') || l.includes('instagram') || l.includes('twitter') || l.includes('map') ||
        l.includes('placeholder')) return false;
    // Only real estate images - photos from cloudfront, lp-cdn, cloudinary etc.
    if (l.includes('dlajgvw9htjpb.cloudfront') || l.includes('lp-cdn.com/media/') || 
        l.includes('cloudinary.com') || l.includes('.jpg') || l.includes('.jpeg') || 
        l.includes('.webp') || l.includes('.png')) return true;
    return false;
  };
  $(el).find('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('data-original');
    if (src) {
      try {
        const abs = new URL(src, baseUrl).href;
        if (isValid(abs) && !imgs.includes(abs)) imgs.push(abs);
      } catch (e) {}
    }
    const srcset = $(img).attr('srcset') || $(img).attr('data-srcset');
    if (srcset) {
      const parts = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
      parts.forEach(p => {
        try {
          const abs = new URL(p, baseUrl).href;
          if (isValid(abs) && !imgs.includes(abs)) imgs.push(abs);
        } catch (e) {}
      });
    }
  });
  return imgs;
}

// Helper: parse price from text (e.g. "$2,975,000" or "$1,725/Mo")
function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/,/g, '').replace(/\/mo.*$/i, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

// Helper: parse beds/baths from text like "6 BD | 6 BA" or "2 BD | 1 BA"
function parseBeds(text) {
  const match = text.match(/(\d+)\s*(?:BD|BED|BEDROOM)/i);
  return match ? parseInt(match[1]) : null;
}
function parseBaths(text) {
  const match = text.match(/(\d+\.?\d*)\s*(?:BA|BATH)/i);
  return match ? parseFloat(match[1]) : null;
}
function parseSqft(text) {
  const match = text.match(/([\d,]+)\s*(?:SQ\.?\s*FT|SQFT)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''));
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY A: Luxury Presence-based sites (property-list__item pattern)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeLuxuryPresenceSite(baseUrl, html) {
  const properties = [];
  const $ = cheerio.load(html);
  const items = $('li.property-list__item, .property-list__item');
  
  if (items.length === 0) return null; // Not LP site

  console.log(`[LP Scraper] Found ${items.length} items on listing page`);

  items.each((_, item) => {
    const $item = $(item);
    
    // Get property detail link
    const linkHref = $item.find('a.property-list__item-link, .property-list__view a, a[href*="/properties/"]').first().attr('href');
    const detailUrl = linkHref ? new URL(linkHref, baseUrl).href : '';
    
    // Extract image - the main property photo
    const imgEl = $item.find('.property-list__img img').first();
    const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
    const photos = imgSrc ? [imgSrc] : [];

    // Extract text block
    const textEl = $item.find('.property-list__text');
    const title = textEl.find('h4').text().trim();
    const addressLines = textEl.find('p').map((_, p) => $(p).text().trim()).get();
    const fullAddress = addressLines[0] || title;

    // Price is in h5
    const priceText = textEl.find('h5').text().trim();
    const price = parsePrice(priceText);

    // Beds/baths/sqft from second <p>
    const detailsText = addressLines[1] || '';
    const bedrooms = parseBeds(detailsText);
    const bathrooms = parseBaths(detailsText);
    const square_feet = parseSqft(detailsText);

    // Status label (For Sale, For Lease, Active Under Contract, etc.)
    const statusText = $item.find('.property-list__label').text().trim();
    const isRent = /lease|rent|rental/i.test(statusText);

    const parsed = parseAddressDetails(fullAddress);

    if (fullAddress && fullAddress.length > 5) {
      properties.push({
        address: fullAddress,
        city: parsed.city,
        state: parsed.state,
        zip_code: parsed.zip_code,
        price,
        property_type: 'Single Family',
        bedrooms,
        bathrooms,
        square_feet,
        description: statusText || null,
        photos,
        url: detailUrl,
        listing_type: isRent ? 'For Rent' : 'For Sale',
      });
    }
  });

  return properties;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY B: Generic property card scraper (fallback)
// ─────────────────────────────────────────────────────────────────────────────
async function scrapeGenericSite(baseUrl, html, pageUrl) {
  const properties = [];
  const $ = cheerio.load(html);

  const cardSelectors = [
    '.property-card', '.listing-card', '.property-item', '.listing-item',
    '.card-property', '.estate-item', 'article[class*="property"]',
    '[data-listing]', '[data-property]', '.home-card',
    'div[class*="property-card"]', 'div[class*="listing-card"]',
    'li[class*="property"]', 'li[class*="listing"]'
  ];

  $(cardSelectors.join(', ')).each((_, cardEl) => {
    const cardText = $(cardEl).text().replace(/\s+/g, ' ').trim();
    if (cardText.length < 20) return;
    const hasPrice = cardText.includes('$');
    const hasBed = /\d\s*(?:bd|bed)/i.test(cardText);
    const hasBath = /\d\s*(?:ba|bath)/i.test(cardText);
    if (!hasPrice && !hasBed && !hasBath) return;

    const imgs = extractImages($, cardEl, baseUrl);
    const linkHref = $(cardEl).find('a').attr('href') || '';
    let link = '';
    try { link = new URL(linkHref, baseUrl).href; } catch (e) {}

    const price = parsePrice(cardText.match(/\$[\d,]+(?:\/mo)?/i)?.[0] || '');
    const bedrooms = parseBeds(cardText);
    const bathrooms = parseBaths(cardText);
    const square_feet = parseSqft(cardText);

    // Try to find address - look for text that looks like an address
    const addrMatch = cardText.match(/\d+\s+[A-Z][^\n]+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct|Pl|Pkwy|Hwy|Circle|Loop|Trail)[^\n]*/i);
    const address = addrMatch ? addrMatch[0].slice(0, 120).trim() : '';
    if (!address) return;

    const parsed = parseAddressDetails(address);
    properties.push({
      address,
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip_code,
      price,
      property_type: 'Single Family',
      bedrooms,
      bathrooms,
      square_feet,
      description: null,
      photos: imgs.slice(0, 6),
      url: link || pageUrl,
      listing_type: 'For Sale',
    });
  });

  return properties;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: Discover listing pages and scrape all properties
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { bot_id } = await request.json();

    if (!bot_id) {
      return Response.json({ error: 'bot_id is required' }, { status: 400 });
    }

    // 1. Fetch website_url
    const { data: botProfile } = await supabase
      .from('bots')
      .select('website_url, user_id')
      .eq('id', bot_id)
      .single();

    let websiteUrl = botProfile?.website_url?.trim();

    if (!websiteUrl && botProfile?.user_id) {
      const { data: subProfile } = await supabase
        .from('users_subscription')
        .select('website_url')
        .eq('user_id', botProfile.user_id)
        .single();
      websiteUrl = subProfile?.website_url?.trim();
    }

    if (!websiteUrl) {
      return Response.json({ error: 'Website URL not found. Go to My Profile and save your website URL first.' }, { status: 400 });
    }

    const baseUrl = new URL(websiteUrl).origin;
    console.log(`[Scraper] Starting crawl for: ${websiteUrl}`);

    // 2. Discover ALL listing pages to crawl
    // Start with the configured URL, then auto-discover from common paths & links
    const listingPageUrls = new Set([websiteUrl]);
    
    // Common real estate listing path patterns to try
    const commonPaths = [
      '/listings', '/properties', '/properties/sale', '/properties/sold',
      '/our-listings', '/featured-listings', '/homes-for-sale', '/for-sale',
      '/rentals', '/for-rent', '/search', '/inventory', '/buy', '/rent',
      '/properties/lease', '/properties/for-sale', '/all-listings',
      '/residential', '/commercial', '/active-listings'
    ];

    // Test common paths for valid listing pages
    const pathTests = commonPaths.map(async (p) => {
      const u = new URL(p, baseUrl).href;
      const html = await fetchHtml(u);
      if (!html) return;
      const $ = cheerio.load(html);
      // Must have at least 3 property items to count as a listing page
      const itemCount = $('li.property-list__item, .property-list__item, .property-card, .listing-card, article').length;
      if (itemCount >= 3) {
        listingPageUrls.add(u);
        console.log(`[Scraper] Found listing page: ${u} (${itemCount} items)`);
      }
    });
    await Promise.allSettled(pathTests);

    // Also crawl the homepage to find listing page links
    const homeHtml = await fetchHtml(baseUrl);
    if (homeHtml) {
      const $ = cheerio.load(homeHtml);
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const abs = new URL(href, baseUrl).href;
          if (!abs.startsWith(baseUrl)) return;
          const lower = abs.toLowerCase();
          if (lower.includes('listing') || lower.includes('propert') || 
              lower.includes('for-sale') || lower.includes('for-rent') || 
              lower.includes('buy') || lower.includes('rent') || lower.includes('homes')) {
            listingPageUrls.add(abs);
          }
        } catch (e) {}
      });
    }

    console.log(`[Scraper] Will crawl ${listingPageUrls.size} listing pages:`, Array.from(listingPageUrls));

    // 3. Scrape all listing pages and collect property slugs/links
    const allPropertyLinks = new Set(); // detail page links
    const rawProperties = []; // extracted from listing page cards
    const seenAddresses = new Set();

    for (const pageUrl of listingPageUrls) {
      const html = await fetchHtml(pageUrl);
      if (!html) continue;

      // Try LP strategy first
      const lpProps = await scrapeLuxuryPresenceSite(baseUrl, html);
      if (lpProps && lpProps.length > 0) {
        console.log(`[Scraper] LP strategy extracted ${lpProps.length} props from ${pageUrl}`);
        lpProps.forEach(p => {
          if (p.url && p.url.startsWith(baseUrl)) allPropertyLinks.add(p.url);
          const addrKey = p.address.toLowerCase().trim();
          if (!seenAddresses.has(addrKey)) {
            seenAddresses.add(addrKey);
            rawProperties.push(p);
          }
        });
        continue;
      }

      // Fallback generic strategy
      const genericProps = await scrapeGenericSite(baseUrl, html, pageUrl);
      if (genericProps.length > 0) {
        console.log(`[Scraper] Generic strategy extracted ${genericProps.length} props from ${pageUrl}`);
        genericProps.forEach(p => {
          if (p.url && p.url.startsWith(baseUrl)) allPropertyLinks.add(p.url);
          const addrKey = p.address.toLowerCase().trim();
          if (!seenAddresses.has(addrKey)) {
            seenAddresses.add(addrKey);
            rawProperties.push(p);
          }
        });
      }

      // Also discover property links from this page to fill missing images later
      const $ = cheerio.load(html);
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const abs = new URL(href, baseUrl).href;
          if (abs.startsWith(baseUrl) && !abs.endsWith('/sale') && !abs.endsWith('/sold') && !abs.endsWith('/rent')) {
            const l = abs.toLowerCase();
            if (l.includes('/properties/') || l.includes('/listing/') || l.includes('/homes/')) {
              allPropertyLinks.add(abs);
            }
          }
        } catch (e) {}
      });
    }

    console.log(`[Scraper] Total property links to detail-visit: ${allPropertyLinks.size}`);
    console.log(`[Scraper] Properties from listing pages: ${rawProperties.length}`);

    // 4. Visit each property detail page to enrich with MORE images & exact price
    // We'll enrich existing rawProperties AND discover any missing ones
    const enrichedProperties = [...rawProperties];
    const enrichedAddresses = new Set(rawProperties.map(p => p.address.toLowerCase().trim()));

    // Only detail-page enrich properties that have no/few images or missing price
    const propsToEnrich = enrichedProperties.filter(p => p.photos.length === 0 || p.price === null);
    const detailLinksToCheck = Array.from(allPropertyLinks).slice(0, 100); // cap at 100 detail pages

    // Match detail links to rawProperties and enrich
    for (const detailUrl of detailLinksToCheck) {
      // Find matching raw property
      const matchingProp = enrichedProperties.find(p => p.url === detailUrl);
      const needsEnrich = !matchingProp || matchingProp.photos.length === 0 || matchingProp.price === null;
      
      if (!needsEnrich && matchingProp) continue; // Already fully enriched

      const html = await fetchHtml(detailUrl);
      if (!html) continue;

      const $ = cheerio.load(html);

      // Extract images from detail page (gallery)
      const detailImgs = [];
      $('img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
        if (src) {
          try {
            const abs = new URL(src, baseUrl).href;
            const l = abs.toLowerCase();
            if ((l.includes('cloudfront') || l.includes('cloudinary') || 
                 l.includes('.jpg') || l.includes('.jpeg') || l.includes('.webp')) &&
                !l.includes('logo') && !l.includes('icon') && !l.includes('avatar') &&
                !l.includes('map') && !l.includes('lp-cdn.com/media/awp') &&
                !l.includes('lp-cdn.com/media/xtzvxp')) {
              if (!detailImgs.includes(abs)) detailImgs.push(abs);
            }
          } catch (e) {}
        }
      });

      // Extract price from detail page
      let detailPrice = null;
      const priceEl = $('h5, .price, [class*="price"], [data-price]').first();
      if (priceEl.length) detailPrice = parsePrice(priceEl.text());

      // Extract bedrooms/bathrooms from detail page
      const pageText = $.text();
      const detailBeds = parseBeds(pageText);
      const detailBaths = parseBaths(pageText);
      const detailSqft = parseSqft(pageText);

      // Meta image as fallback
      const metaImg = $('meta[property="og:image"]').attr('content') || '';

      if (matchingProp) {
        // Enrich existing property
        if (matchingProp.photos.length === 0 && detailImgs.length > 0) {
          matchingProp.photos = detailImgs.slice(0, 8);
        } else if (detailImgs.length > matchingProp.photos.length) {
          // Merge unique photos
          const merged = [...matchingProp.photos, ...detailImgs];
          matchingProp.photos = [...new Set(merged)].slice(0, 8);
        }
        if (matchingProp.photos.length === 0 && metaImg) matchingProp.photos = [metaImg];
        if (!matchingProp.price && detailPrice) matchingProp.price = detailPrice;
        if (!matchingProp.bedrooms && detailBeds) matchingProp.bedrooms = detailBeds;
        if (!matchingProp.bathrooms && detailBaths) matchingProp.bathrooms = detailBaths;
        if (!matchingProp.square_feet && detailSqft) matchingProp.square_feet = detailSqft;
      } else {
        // This is a property we found from a link but not from a listing card
        // Try to extract address from the detail page
        const title = $('h1, h2').first().text().trim();
        const metaTitle = $('meta[property="og:title"]').attr('content') || '';
        const descText = $('meta[property="og:description"]').attr('content') || '';
        const fullAddress = $('meta[property="og:url"]').attr('content')?.split('/properties/')[1]?.replace(/-/g, ' ') || title;

        if (!fullAddress || fullAddress.length < 5) continue;
        const addrKey = fullAddress.toLowerCase().trim();
        if (enrichedAddresses.has(addrKey)) continue;
        enrichedAddresses.add(addrKey);

        const parsed = parseAddressDetails(fullAddress);
        const imgs = detailImgs.length > 0 ? detailImgs.slice(0, 8) : (metaImg ? [metaImg] : []);

        enrichedProperties.push({
          address: fullAddress,
          city: parsed.city,
          state: parsed.state,
          zip_code: parsed.zip_code,
          price: detailPrice,
          property_type: 'Single Family',
          bedrooms: detailBeds,
          bathrooms: detailBaths,
          square_feet: detailSqft,
          description: descText ? descText.slice(0, 300) : null,
          photos: imgs,
          url: detailUrl,
          listing_type: 'For Sale',
        });
      }
    }

    const allProperties = enrichedProperties.filter(p => p.address && p.address.length > 5);

    console.log(`[Scraper] Final enriched property count: ${allProperties.length}`);

    if (allProperties.length === 0) {
      return Response.json({ message: 'No properties found on the website.', added: 0, removed: 0 });
    }

    // 5. Full 2-Way Sync with Database
    const { data: dbProps } = await supabase
      .from('properties')
      .select('property_id, address')
      .eq('bot_id', bot_id);

    const dbAddressesMap = new Map();
    if (dbProps && Array.isArray(dbProps)) {
      dbProps.forEach(p => {
        if (p.address) dbAddressesMap.set(p.address.toLowerCase().trim(), p.property_id);
      });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let removedCount = 0;

    for (const prop of allProperties) {
      const addrKey = prop.address.toLowerCase().trim();
      const existingPropId = dbAddressesMap.get(addrKey);

      const payload = {
        city: prop.city || null,
        state: prop.state || null,
        zip_code: prop.zip_code || null,
        price: prop.price || null,
        property_type: prop.property_type || 'Single Family',
        bedrooms: prop.bedrooms || null,
        bathrooms: prop.bathrooms || null,
        square_feet: prop.square_feet || null,
        description: prop.description || null,
        photos: prop.photos?.length > 0 ? prop.photos : [],
        source_url: websiteUrl,
        status: 'Active',
        updated_at: new Date().toISOString(),
      };

      if (existingPropId) {
        const { error } = await supabase.from('properties').update(payload).eq('property_id', existingPropId);
        if (!error) updatedCount++;
        dbAddressesMap.delete(addrKey);
      } else {
        const { error } = await supabase.from('properties').insert([{
          bot_id,
          address: prop.address,
          ...payload,
        }]);
        if (!error) addedCount++;
      }
    }

    // Delete properties no longer on website
    for (const [, property_id] of dbAddressesMap.entries()) {
      const { error } = await supabase.from('properties').delete().eq('property_id', property_id);
      if (!error) removedCount++;
    }

    console.log(`[Scraper] Done: Added=${addedCount}, Updated=${updatedCount}, Removed=${removedCount}`);

    return Response.json({
      message: `Sync complete! Found ${allProperties.length} listings.`,
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
