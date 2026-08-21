const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

function parsePrice(text) {
  if (!text) return null;
  const clean = text.replace(/,/g, '').replace(/\/mo.*$/i, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

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

async function scrapeAllProperties() {
  const baseUrl = 'https://century21sgr.com';
  
  // 1. Fetch listing pages
  const listingPages = [
    'https://century21sgr.com/properties/sale',
    'https://century21sgr.com/properties/sold',
    'https://century21sgr.com/our-listings',
    'https://century21sgr.com/featured-listings',
    'https://century21sgr.com/properties'
  ];

  const allPropertyLinks = new Set();
  const propertiesMap = new Map();

  for (const pageUrl of listingPages) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);

    // Look for property-list__item
    const items = $('li.property-list__item, .property-list__item');
    console.log(`Page ${pageUrl}: found ${items.length} cards`);

    items.each((_, item) => {
      const $item = $(item);
      const linkHref = $item.find('a.property-list__item-link, .property-list__view a, a[href*="/properties/"]').first().attr('href');
      const detailUrl = linkHref ? new URL(linkHref, baseUrl).href : '';

      const imgEl = $item.find('.property-list__img img').first();
      const imgSrc = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
      const photos = imgSrc ? [imgSrc] : [];

      const textEl = $item.find('.property-list__text');
      const title = textEl.find('h4').text().trim();
      const addressLines = textEl.find('p').map((_, p) => $(p).text().trim()).get();
      const fullAddress = addressLines[0] || title;

      const priceText = textEl.find('h5').text().trim();
      const price = parsePrice(priceText);

      const detailsText = addressLines[1] || '';
      const bedrooms = parseBeds(detailsText);
      const bathrooms = parseBaths(detailsText);
      const square_feet = parseSqft(detailsText);

      if (detailUrl) allPropertyLinks.add(detailUrl);

      if (fullAddress && fullAddress.length > 5) {
        const addrKey = fullAddress.toLowerCase().trim();
        if (!propertiesMap.has(addrKey)) {
          const parsed = parseAddressDetails(fullAddress);
          propertiesMap.set(addrKey, {
            address: fullAddress,
            city: parsed.city,
            state: parsed.state,
            zip_code: parsed.zip_code,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            photos,
            url: detailUrl
          });
        }
      }
    });

    // Also collect all property detail links from this page
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const abs = new URL(href, baseUrl).href;
        if (abs.includes('/properties/') && !abs.endsWith('/sale') && !abs.endsWith('/sold') && !abs.endsWith('/rent')) {
          allPropertyLinks.add(abs);
        }
      } catch (e) {}
    });
  }

  console.log(`\nDiscovered ${propertiesMap.size} properties from listing cards.`);
  console.log(`Discovered ${allPropertyLinks.size} unique detail URLs.`);

  // 2. Now enrich detail URLs that were not on card pages
  const detailUrls = Array.from(allPropertyLinks);
  let detailScrapedCount = 0;

  // Process detail URLs in batches of 10 concurrently
  const batchSize = 10;
  for (let i = 0; i < detailUrls.length; i += batchSize) {
    const batch = detailUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(async (detailUrl) => {
      // Check if already in propertiesMap
      const matching = Array.from(propertiesMap.values()).find(p => p.url === detailUrl);
      if (matching && matching.photos.length > 0 && matching.price !== null) {
        return; // already complete
      }

      const dHtml = await fetchHtml(detailUrl);
      if (!dHtml) return;
      const $ = cheerio.load(dHtml);

      // Title & Address
      const h1Text = $('h1').first().text().trim();
      const metaTitle = $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() || '';
      const address = h1Text || metaTitle;
      if (!address || address.length < 5) return;

      // Price: look for h5 or element with $
      let price = null;
      const h5Price = $('h5').first().text().trim();
      if (h5Price && h5Price.includes('$')) {
        price = parsePrice(h5Price);
      } else {
        const priceEl = $('*').filter((_, el) => $(el).clone().children().remove().end().text().trim().startsWith('$')).first();
        if (priceEl.length) price = parsePrice(priceEl.text().trim());
      }

      // Photos
      const detailImgs = [];
      const metaImg = $('meta[property="og:image"]').attr('content');
      if (metaImg && !metaImg.includes('logo') && !metaImg.includes('avatar')) {
        detailImgs.push(metaImg);
      }
      $('img').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
        if (src) {
          try {
            const abs = new URL(src, baseUrl).href;
            const l = abs.toLowerCase();
            if ((l.includes('cloudfront') || l.includes('lp-cdn.com/media/') || l.includes('cloudinary')) &&
                !l.includes('logo') && !l.includes('icon') && !l.includes('avatar') &&
                !l.includes('awpfetclqbwrgfrtsuti') && !l.includes('xtzvxp72p1lo6jtwjxpd')) {
              if (!detailImgs.includes(abs)) detailImgs.push(abs);
            }
          } catch (e) {}
        }
      });

      // Beds / Baths / Sqft
      const bodyText = $('body').text();
      const bedrooms = parseBeds(bodyText);
      const bathrooms = parseBaths(bodyText);
      const square_feet = parseSqft(bodyText);

      const addrKey = address.toLowerCase().trim();
      const parsed = parseAddressDetails(address);

      if (matching) {
        if (matching.photos.length === 0 && detailImgs.length > 0) matching.photos = detailImgs.slice(0, 8);
        if (matching.price === null && price !== null) matching.price = price;
        if (matching.bedrooms === null && bedrooms !== null) matching.bedrooms = bedrooms;
        if (matching.bathrooms === null && bathrooms !== null) matching.bathrooms = bathrooms;
        if (matching.square_feet === null && square_feet !== null) matching.square_feet = square_feet;
      } else if (!propertiesMap.has(addrKey)) {
        propertiesMap.set(addrKey, {
          address,
          city: parsed.city,
          state: parsed.state,
          zip_code: parsed.zip_code,
          price,
          bedrooms,
          bathrooms,
          square_feet,
          photos: detailImgs.slice(0, 8),
          url: detailUrl
        });
        detailScrapedCount++;
      }
    }));
  }

  const finalProperties = Array.from(propertiesMap.values());
  console.log(`\n================ FINAL RESULTS ================`);
  console.log(`Total properties extracted: ${finalProperties.length}`);
  const withImages = finalProperties.filter(p => p.photos && p.photos.length > 0);
  const withPrices = finalProperties.filter(p => p.price !== null && p.price > 0);
  console.log(`With photos: ${withImages.length}/${finalProperties.length} (${Math.round(withImages.length/finalProperties.length*100)}%)`);
  console.log(`With prices: ${withPrices.length}/${finalProperties.length} (${Math.round(withPrices.length/finalProperties.length*100)}%)`);

  console.log('\nSample 5 extracted properties:');
  console.log(JSON.stringify(finalProperties.slice(0, 5), null, 2));
}

scrapeAllProperties();
