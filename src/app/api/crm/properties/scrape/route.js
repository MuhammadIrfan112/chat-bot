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
async function fetchHtml(url, timeout = 12000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

// Helper: parse price from text (e.g. "$2,975,000" or "$1,725/Mo")
function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/,/g, '').replace(/\/mo.*$/i, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? null : num;
}

// Helper: parse beds/baths/sqft from text
function parseBeds(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(?:BD|BED|BEDROOM)/i);
  return match ? parseInt(match[1]) : null;
}
function parseBaths(text) {
  if (!text) return null;
  const match = text.match(/(\d+\.?\d*)\s*(?:BA|BATH)/i);
  return match ? parseFloat(match[1]) : null;
}
function parseSqft(text) {
  if (!text) return null;
  const match = text.match(/([\d,]+)\s*(?:SQ\.?\s*FT|SQFT)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''));
}

export async function POST(request) {
  try {
    const { bot_id } = await request.json();

    if (!bot_id) {
      return Response.json({ error: 'bot_id is required' }, { status: 400 });
    }

    // 1. Fetch website_url from bot profile (check bots table first, then users_subscription)
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
    console.log(`[Scraper] Starting comprehensive crawl for: ${websiteUrl}`);

    const propertiesMap = new Map();
    const allDetailUrls = new Set();

    // 2. Discover Property URLs from Sitemaps (Fastest method for 100+ properties)
    const sitemapEndpoints = [
      `${baseUrl}/sitemap-properties-dpages--0.xml`,
      `${baseUrl}/sitemap-properties-dpages--1.xml`,
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/properties-sitemap.xml`
    ];

    for (const smUrl of sitemapEndpoints) {
      const xml = await fetchHtml(smUrl, 10000);
      if (xml) {
        // Extract all <loc> urls that point to properties
        const matches = xml.match(/<loc>(https?:\/\/[^\s<>"']+)<\/loc>/gi) || [];
        matches.forEach(m => {
          const u = m.replace(/<\/?loc>/gi, '').trim();
          if (u && (u.includes('/properties/') || u.includes('/listing/')) && 
              !u.endsWith('/sale') && !u.endsWith('/sold') && !u.endsWith('/rent') && !u.endsWith('/lease')) {
            allDetailUrls.add(u);
          }
        });
      }
    }

    console.log(`[Scraper] Discovered ${allDetailUrls.size} property URLs from XML sitemaps.`);

    // 3. Discover Listing & Agent Pages to crawl
    const listingSeedPages = [
      websiteUrl,
      `${baseUrl}/properties/sale`,
      `${baseUrl}/properties/sold`,
      `${baseUrl}/properties/rent`,
      `${baseUrl}/properties/lease`,
      `${baseUrl}/our-listings`,
      `${baseUrl}/featured-listings`,
      `${baseUrl}/homes-for-sale`,
      `${baseUrl}/for-sale`,
      `${baseUrl}/rentals`,
      `${baseUrl}/properties`,
      `${baseUrl}/home-search/listings`
    ];

    // Check agent sitemaps if available
    const agentXml = await fetchHtml(`${baseUrl}/sitemap-agent-dpages.xml`, 8000);
    if (agentXml) {
      const agentMatches = agentXml.match(/<loc>(https?:\/\/[^\s<>"']+)<\/loc>/gi) || [];
      agentMatches.slice(0, 30).forEach(m => {
        const u = m.replace(/<\/?loc>/gi, '').trim();
        if (u) listingSeedPages.push(u);
      });
    }

    // Crawl all listing seed pages in parallel batches
    const pageBatchSize = 6;
    for (let i = 0; i < listingSeedPages.length; i += pageBatchSize) {
      const batch = listingSeedPages.slice(i, i + pageBatchSize);
      await Promise.all(batch.map(async (pageUrl) => {
        const html = await fetchHtml(pageUrl, 12000);
        if (!html) return;
        const $ = cheerio.load(html);

        // A. Extract Luxury Presence & Generic Listing Cards
        const cardSelectors = [
          'li.property-list__item', '.property-list__item',
          '.property-card', '.listing-card', '.property-item', '.listing-item',
          '.card-property', '.estate-item', 'article'
        ];

        $(cardSelectors.join(', ')).each((_, item) => {
          const $item = $(item);
          const linkHref = $item.find('a.property-list__item-link, .property-list__view a, a[href*="/properties/"], a[href*="/listing/"]').first().attr('href') || $item.find('a').first().attr('href');
          let detailUrl = '';
          if (linkHref) {
            try { detailUrl = new URL(linkHref, baseUrl).href; } catch (e) {}
          }

          // Image extraction
          const imgEl = $item.find('.property-list__img img, img').first();
          const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || imgEl.attr('data-original') || '';
          let validImg = '';
          if (imgSrc && !imgSrc.includes('logo') && !imgSrc.includes('icon') && !imgSrc.includes('avatar')) {
            try { validImg = new URL(imgSrc, baseUrl).href; } catch (e) {}
          }

          // Text & Price
          const textEl = $item.find('.property-list__text');
          const title = textEl.find('h4').text().trim() || $item.find('h3, h4, .title, [class*="title"]').first().text().trim();
          const pTexts = (textEl.length ? textEl : $item).find('p').map((_, p) => $(p).text().trim()).get();
          const fullAddress = pTexts[0] || title;

          // Price extraction from h5, .price, or text
          const priceText = (textEl.length ? textEl : $item).find('h5, .price, [class*="price"]').text().trim() || 
                            $item.text().match(/\$[\d,]+(?:\/mo)?/i)?.[0] || '';
          const price = parsePrice(priceText);

          const detailsText = pTexts.slice(1).join(' ') || $item.text();
          const bedrooms = parseBeds(detailsText);
          const bathrooms = parseBaths(detailsText);
          const square_feet = parseSqft(detailsText);

          if (detailUrl && (detailUrl.includes('/properties/') || detailUrl.includes('/listing/'))) {
            allDetailUrls.add(detailUrl);
          }

          if (fullAddress && fullAddress.length > 5) {
            const addrKey = fullAddress.toLowerCase().trim();
            if (!propertiesMap.has(addrKey)) {
              const parsed = parseAddressDetails(fullAddress);
              propertiesMap.set(addrKey, {
                address: fullAddress,
                city: parsed.city,
                state: parsed.state,
                zip_code: parsed.zip_code,
                price: price || null,
                property_type: 'Single Family',
                bedrooms: bedrooms || null,
                bathrooms: bathrooms || null,
                square_feet: square_feet || null,
                description: null,
                photos: validImg ? [validImg] : [],
                url: detailUrl || pageUrl
              });
            }
          }
        });

        // B. Extract any links pointing to individual properties
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          try {
            const abs = new URL(href, baseUrl).href;
            if (abs.startsWith(baseUrl) && (abs.includes('/properties/') || abs.includes('/listing/')) &&
                !abs.endsWith('/sale') && !abs.endsWith('/sold') && !abs.endsWith('/rent') && !abs.endsWith('/lease')) {
              allDetailUrls.add(abs);
            }
          } catch (e) {}
        });
      }));
    }

    console.log(`[Scraper] Discovered ${propertiesMap.size} properties from listing cards.`);
    console.log(`[Scraper] Discovered ${allDetailUrls.size} total property detail URLs.`);

    // 4. Crawl Property Detail Pages in Parallel Batches to enrich all photos & prices
    const detailUrlsList = Array.from(allDetailUrls).slice(0, 150); // Scrape up to 150 unique properties
    const detailBatchSize = 15;

    for (let i = 0; i < detailUrlsList.length; i += detailBatchSize) {
      const batch = detailUrlsList.slice(i, i + detailBatchSize);
      await Promise.all(batch.map(async (detailUrl) => {
        // Find existing property if already parsed from card
        const matching = Array.from(propertiesMap.values()).find(p => p.url === detailUrl);
        if (matching && matching.photos.length >= 2 && matching.price !== null) {
          return; // Already fully complete
        }

        const html = await fetchHtml(detailUrl, 10000);
        if (!html) return;
        const $ = cheerio.load(html);

        // Address & Title
        const h1 = $('h1').first().text().trim();
        const metaTitle = $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() || '';
        const address = h1 || metaTitle;
        if (!address || address.length < 5) return;

        // Price: check h5, .price, og:description, or any $ element
        let price = null;
        const h5Text = $('h5').first().text().trim();
        if (h5Text && h5Text.includes('$')) {
          price = parsePrice(h5Text);
        }
        if (!price) {
          const priceEls = $('*').filter((_, el) => $(el).clone().children().remove().end().text().trim().startsWith('$'));
          if (priceEls.length) {
            price = parsePrice(priceEls.first().text().trim());
          }
        }
        if (!price) {
          const metaDesc = $('meta[property="og:description"]').attr('content') || '';
          const matchPrice = metaDesc.match(/\$[\d,]+(?:\/mo)?/i);
          if (matchPrice) price = parsePrice(matchPrice[0]);
        }

        // Photos: collect og:image + high-res gallery images
        const detailImgs = [];
        const metaImg = $('meta[property="og:image"]').attr('content');
        if (metaImg && !metaImg.includes('logo') && !metaImg.includes('avatar') && !metaImg.includes('icon')) {
          detailImgs.push(metaImg);
        }

        $('img').each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src') || $(img).attr('data-original');
          if (src) {
            try {
              const abs = new URL(src, baseUrl).href;
              const l = abs.toLowerCase();
              if ((l.includes('cloudfront') || l.includes('lp-cdn.com/media/') || l.includes('cloudinary') || l.includes('.jpg') || l.includes('.jpeg') || l.includes('.webp')) &&
                  !l.includes('logo') && !l.includes('icon') && !l.includes('avatar') &&
                  !l.includes('pixel') && !l.includes('awpfetclqbwrgfrtsuti') && !l.includes('xtzvxp72p1lo6jtwjxpd')) {
                if (!detailImgs.includes(abs)) detailImgs.push(abs);
              }
            } catch (e) {}
          }
        });

        // Beds / Baths / Sqft
        const pageText = $('body').text();
        const bedrooms = parseBeds(pageText);
        const bathrooms = parseBaths(pageText);
        const square_feet = parseSqft(pageText);
        const description = $('meta[property="og:description"]').attr('content')?.slice(0, 300) || null;

        const addrKey = address.toLowerCase().trim();
        const parsed = parseAddressDetails(address);

        if (matching) {
          // Enrich existing
          if (detailImgs.length > 0) matching.photos = [...new Set([...matching.photos, ...detailImgs])].slice(0, 10);
          if (matching.price === null && price !== null) matching.price = price;
          if (matching.bedrooms === null && bedrooms !== null) matching.bedrooms = bedrooms;
          if (matching.bathrooms === null && bathrooms !== null) matching.bathrooms = bathrooms;
          if (matching.square_feet === null && square_feet !== null) matching.square_feet = square_feet;
          if (!matching.description && description) matching.description = description;
        } else if (!propertiesMap.has(addrKey)) {
          propertiesMap.set(addrKey, {
            address,
            city: parsed.city,
            state: parsed.state,
            zip_code: parsed.zip_code,
            price: price || null,
            property_type: 'Single Family',
            bedrooms: bedrooms || null,
            bathrooms: bathrooms || null,
            square_feet: square_feet || null,
            description,
            photos: detailImgs.slice(0, 10),
            url: detailUrl
          });
        }
      }));
    }

    const allProperties = Array.from(propertiesMap.values()).filter(p => p.address && p.address.length > 5);

    console.log(`[Scraper] Final extracted property count: ${allProperties.length}`);

    if (allProperties.length === 0) {
      return Response.json({ message: 'No properties found on the website.', added: 0, removed: 0, total: 0 });
    }

    // 5. Database 2-Way Sync
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
        photos: prop.photos && prop.photos.length > 0 ? prop.photos : [],
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

    console.log(`[Scraper] Done: Added=${addedCount}, Updated=${updatedCount}, Removed=${removedCount}, Total=${allProperties.length}`);

    return Response.json({
      message: `Website synced successfully! Found ${allProperties.length} active listings.`,
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
