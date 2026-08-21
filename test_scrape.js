const cheerio = require('cheerio');

async function test() {
  const urls = [
    'https://century21sgr.com',
    'https://century21sgr.com/properties/sale',
    'https://century21sgr.com/properties/rent'
  ];

  for (const url of urls) {
    console.log('\n================================');
    console.log('Fetching:', url);
    try {
      const res = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      console.log('Status:', res.status);
      const html = await res.text();
      console.log('HTML length:', html.length);
      const $ = cheerio.load(html);

      // Check for property cards / listing containers
      console.log('Sample text snippets:');
      $('div, article, li, section').each((i, el) => {
        const cls = $(el).attr('class') || '';
        const id = $(el).attr('id') || '';
        if (cls.includes('property') || cls.includes('listing') || cls.includes('card') || id.includes('property')) {
          console.log(`Tag <${el.tagName} class="${cls}" id="${id}">:`, $(el).text().replace(/\s+/g, ' ').slice(0, 200));
        }
      });

      // Check all links
      const links = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('properties') || href.includes('sale') || href.includes('rent') || href.includes('listing') || href.includes('page') || href.includes('?'))) {
          links.push(href);
        }
      });
      console.log('Relevant Links count:', links.length, 'Sample:', links.slice(0, 10));

      // Check all images
      const imgs = [];
      $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || $(el).attr('srcset');
        if (src) imgs.push(src);
      });
      console.log('Images count:', imgs.length, 'Sample images:', imgs.slice(0, 10));

      // Check for inline background images
      const bgImgs = [];
      $('[style*="background"]').each((i, el) => {
        bgImgs.push($(el).attr('style'));
      });
      console.log('Background styles count:', bgImgs.length, 'Sample:', bgImgs.slice(0, 5));

    } catch (e) {
      console.error('Fetch error:', e.message);
    }
  }
}

test();
