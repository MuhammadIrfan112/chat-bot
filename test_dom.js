const cheerio = require('cheerio');

async function testDetailPageStructure() {
  const url = 'https://century21sgr.com/properties/1444-w-barry-street-chicago-il-us-60657-mrd12736115';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('og:title:', $('meta[property="og:title"]').attr('content'));
  console.log('h1:', $('h1').map((_, el) => $(el).text().trim()).get());
  console.log('h2:', $('h2').map((_, el) => $(el).text().trim()).get());
  console.log('h3:', $('h3').map((_, el) => $(el).text().trim()).get());
  console.log('h4:', $('h4').map((_, el) => $(el).text().trim()).get());
  console.log('h5:', $('h5').map((_, el) => $(el).text().trim()).get());

  // Find all elements containing $
  console.log('\nElements containing $:');
  $('*').each((_, el) => {
    const t = $(el).clone().children().remove().end().text().trim();
    if (t.startsWith('$') && t.length < 30) {
      console.log(`Tag <${el.tagName} class="${$(el).attr('class') || ''}">: "${t}"`);
    }
  });

  // Find address elements
  console.log('\nAddress elements:');
  $('[class*="address"], [class*="location"], [class*="title"], [itemprop="address"]').each((_, el) => {
    console.log(`Tag <${el.tagName} class="${$(el).attr('class') || ''}">: "${$(el).text().trim()}"`);
  });
}

testDetailPageStructure();
