const cheerio = require('cheerio');

async function discoverAll() {
  const seedUrls = [
    'https://century21sgr.com',
    'https://century21sgr.com/properties/sale',
    'https://century21sgr.com/properties/sold',
    'https://century21sgr.com/properties/rent',
    'https://century21sgr.com/our-listings',
    'https://century21sgr.com/featured-listings',
    'https://century21sgr.com/home-search/listings'
  ];

  const visited = new Set();
  const propertyLinks = new Set();

  for (const url of seedUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      // Find all property links
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const abs = new URL(href, 'https://century21sgr.com').href;
            if (abs.includes('century21sgr.com/properties/') && !abs.endsWith('/sale') && !abs.endsWith('/sold') && !abs.endsWith('/rent')) {
              propertyLinks.add(abs);
            }
          } catch (e) {}
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  console.log(`Discovered ${propertyLinks.size} unique property detail links:`);
  console.log(Array.from(propertyLinks).slice(0, 15));
}

discoverAll();
