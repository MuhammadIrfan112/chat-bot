const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function testSitemapScraper() {
  const baseUrl = 'https://century21sgr.com';
  
  // 1. Discover all property URLs from sitemaps AND listing pages
  const allPropertyUrls = new Set();

  // Try sitemap-properties
  const sitemapUrls = [
    `${baseUrl}/sitemap-properties-dpages--0.xml`,
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`
  ];

  for (const smUrl of sitemapUrls) {
    try {
      const res = await fetch(smUrl, { headers: HEADERS });
      if (res.ok) {
        const xml = await res.text();
        const matches = xml.match(/<loc>(https?:\/\/[^\s<>"']+\/properties\/[^\s<>"']+)<\/loc>/g) || [];
        matches.forEach(m => {
          const u = m.replace(/<\/?loc>/g, '').trim();
          if (u && !u.endsWith('/sale') && !u.endsWith('/sold') && !u.endsWith('/rent')) {
            allPropertyUrls.add(u);
          }
        });
      }
    } catch (e) {}
  }

  console.log(`Discovered ${allPropertyUrls.size} total property detail URLs from sitemap.`);

  // Let's scrape the top 100 properties to test speed and accuracy
  const sampleUrls = Array.from(allPropertyUrls).slice(0, 100);
  const properties = [];

  const batchSize = 15;
  for (let i = 0; i < sampleUrls.length; i += batchSize) {
    const batch = sampleUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(async (url) => {
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return;
        const html = await res.text();
        const $ = cheerio.load(html);

        const h1 = $('h1').first().text().trim();
        const metaTitle = $('meta[property="og:title"]').attr('content')?.split('|')[0]?.trim() || '';
        const address = h1 || metaTitle;
        if (!address || address.length < 5) return;

        // Price
        let price = null;
        const h5 = $('h5').first().text().trim();
        if (h5 && h5.includes('$')) {
          const num = parseFloat(h5.replace(/,/g, '').replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) price = num;
        } else {
          const pEl = $('*').filter((_, el) => $(el).clone().children().remove().end().text().trim().startsWith('$')).first();
          if (pEl.length) {
            const num = parseFloat(pEl.text().replace(/,/g, '').replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) price = num;
          }
        }

        // Image
        const metaImg = $('meta[property="og:image"]').attr('content');
        const imgs = [];
        if (metaImg && !metaImg.includes('logo') && !metaImg.includes('avatar')) {
          imgs.push(metaImg);
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
                if (!imgs.includes(abs)) imgs.push(abs);
              }
            } catch (e) {}
          }
        });

        properties.push({
          address,
          price,
          photosCount: imgs.length,
          firstPhoto: imgs[0] || 'NONE',
          url
        });
      } catch (e) {}
    }));
    console.log(`Processed ${properties.length} / 100 properties...`);
  }

  console.log(`\nExtracted ${properties.length} total properties!`);
  const withPrices = properties.filter(p => p.price !== null && p.price > 0);
  const withPhotos = properties.filter(p => p.photosCount > 0);
  console.log(`With Prices: ${withPrices.length} / ${properties.length}`);
  console.log(`With Photos: ${withPhotos.length} / ${properties.length}`);
  console.log('Sample 3 properties:', JSON.stringify(properties.slice(0, 3), null, 2));
}

testSitemapScraper();
