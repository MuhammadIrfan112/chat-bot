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

async function testFull() {
  const websiteUrl = 'https://century21sgr.com';
  const baseUrl = 'https://century21sgr.com';

  const listingPageUrls = new Set([
    'https://century21sgr.com',
    'https://century21sgr.com/properties/sale',
    'https://century21sgr.com/properties/sold'
  ]);

  const allPropertyLinks = new Set();
  const rawProperties = [];
  const seenAddresses = new Set();

  for (const pageUrl of listingPageUrls) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);

    const items = $('li.property-list__item, .property-list__item');
    console.log(`Page ${pageUrl}: found ${items.length} items.`);

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
        if (!seenAddresses.has(addrKey)) {
          seenAddresses.add(addrKey);
          rawProperties.push({
            address: fullAddress,
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

  console.log(`Raw properties from listing cards: ${rawProperties.length}`);
  console.log(`Total unique detail links found across pages: ${allPropertyLinks.size}`);
  
  // Check how many have images & prices:
  const withImages = rawProperties.filter(p => p.photos.length > 0);
  const withPrices = rawProperties.filter(p => p.price !== null);
  console.log(`With photos: ${withImages.length}/${rawProperties.length}`);
  console.log(`With prices: ${withPrices.length}/${rawProperties.length}`);
  console.log('Sample 3 properties:', JSON.stringify(rawProperties.slice(0, 3), null, 2));

  // Now test how detail pages enrich the rest
  console.log('\nTesting detail page discovery...');
  const detailUrls = Array.from(allPropertyLinks);
  console.log(`Total detail URLs to crawl: ${detailUrls.length}`);

  // Test first 5 detail URLs
  for (const du of detailUrls.slice(0, 5)) {
    const dHtml = await fetchHtml(du);
    if (!dHtml) continue;
    const $ = cheerio.load(dHtml);
    const title = $('h1, h2').first().text().trim();
    const priceText = $('h5, .price, [class*="price"], [data-price]').first().text().trim();
    const metaImg = $('meta[property="og:image"]').attr('content');
    const metaTitle = $('meta[property="og:title"]').attr('content');
    console.log(`Detail URL: ${du}`);
    console.log(`  Title: ${title} | MetaTitle: ${metaTitle}`);
    console.log(`  Price: ${priceText} -> ${parsePrice(priceText)}`);
    console.log(`  Meta Image: ${metaImg}`);
  }
}

testFull();
