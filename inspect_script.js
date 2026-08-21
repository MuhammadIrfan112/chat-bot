const cheerio = require('cheerio');

async function inspectScript29() {
  const url = 'https://century21sgr.com/properties/sale';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  $('script').each((i, el) => {
    const text = $(el).text();
    if (text.includes('luxuryPresence') || text.includes('Handlebars') || text.includes('properties')) {
      console.log(`\n================ SCRIPT ${i} ================\n`);
      console.log(text.slice(0, 4000));
    }
  });
}

inspectScript29();
