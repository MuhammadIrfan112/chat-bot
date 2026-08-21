const cheerio = require('cheerio');

async function testDetail() {
  const url = 'https://century21sgr.com/properties/sale';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Total property-list__item elements:', $('li.property-list__item, .property-list__item, [class*="property-list"]').length);

  $('li.property-list__item, .property-list__item').slice(0, 3).each((i, el) => {
    console.log(`\n--- ITEM ${i+1} HTML ---`);
    console.log($(el).html());
  });

  // Check pagination
  console.log('\n--- PAGINATION ELEMENTS ---');
  $('ul.pagination, .pagination, [class*="page"], nav[aria-label*="page"]').each((i, el) => {
    console.log($(el).html());
  });

  // Check how pagination works on century21sgr.com
  console.log('\n--- ALL A LINKS WITH QUERY OR NUMBER ---');
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && (href.includes('?') || href.includes('page') || /^\d+$/.test(text))) {
      console.log(`Text: "${text}" -> Href: "${href}"`);
    }
  });
}

testDetail();
