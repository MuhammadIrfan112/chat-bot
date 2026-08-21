const cheerio = require('cheerio');

async function testItem() {
  const url = 'https://century21sgr.com/properties/sale';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const items = $('li.property-list__item, .property-list__item');
  console.log('Total items on page 1:', items.length);

  items.slice(0, 2).each((i, el) => {
    console.log(`\n=== ITEM ${i} ===`);
    console.log('Outer HTML:\n', $.html(el));
  });

  // Also check if there are scripts with JSON or API endpoints on the page
  $('script').each((i, el) => {
    const text = $(el).text();
    const src = $(el).attr('src');
    if (src && (src.includes('property') || src.includes('listing') || src.includes('app') || src.includes('main'))) {
      console.log('Script src:', src);
    }
    if (text.includes('properties') || text.includes('pagination') || text.includes('listings') || text.includes('520ac7ddf8664f7ba1fe433f9ab2098f')) {
      console.log('Script with listing/pagination data found (length:', text.length, ') sample:', text.slice(0, 300));
    }
  });
}

testItem();
