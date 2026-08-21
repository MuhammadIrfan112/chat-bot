const cheerio = require('cheerio');

async function testPagination() {
  // Let's test various query params for page 2, 3, etc.
  const testUrls = [
    'https://century21sgr.com/properties/sale?page=2',
    'https://century21sgr.com/properties/sale?p=2',
    'https://century21sgr.com/properties/sale?pg=2',
    'https://century21sgr.com/properties/sale?offset=18',
    'https://century21sgr.com/properties/sale?start=18',
    'https://century21sgr.com/properties/sale/page/2',
    'https://century21sgr.com/properties/sale?520ac7ddf8664f7ba1fe433f9ab2098f=2',
    'https://century21sgr.com/properties/sale?520ac7ddf8664f7ba1fe433f9ab2098f=8',
    'https://century21sgr.com/home-search/listings',
    'https://century21sgr.com/api/properties',
    'https://century21sgr.com/properties'
  ];

  for (const url of testUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
      });
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        const $ = cheerio.load(text);
        const items = $('li.property-list__item, .property-list__item');
        console.log(`  Found ${items.length} items. First item title:`, items.first().find('h4').text().trim() || items.first().text().slice(0, 50));
      }
    } catch (e) {
      console.error(`Error on ${url}:`, e.message);
    }
  }
}

testPagination();
