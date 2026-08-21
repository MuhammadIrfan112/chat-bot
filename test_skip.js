const cheerio = require('cheerio');

async function testWhySkipped() {
  const detailUrls = [
    'https://century21sgr.com/properties/1111-s-wabash-avenue-unit-605-chicago-il-60605-11746190',
    'https://century21sgr.com/properties/901-w-madison-street-unit-512-chicago-il-60607-11324794',
    'https://century21sgr.com/properties/4017-n-keystone-avenue-unit-1s-chicago-il-60641-11100994',
    'https://century21sgr.com/properties/6839-w-127th-street-palos-heights-il-60463-mrd12583423',
    'https://century21sgr.com/properties/1345-s-wabash-avenue-unit-510-chicago-il-60605-11168969'
  ];

  for (const url of detailUrls) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    console.log(`URL: ${url} -> Status: ${res.status}`);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      console.log('  og:title:', $('meta[property="og:title"]').attr('content'));
      console.log('  h1:', $('h1').text().trim());
      console.log('  h5:', $('h5').map((_, el) => $(el).text().trim()).get());
      console.log('  og:image:', $('meta[property="og:image"]').attr('content'));
      console.log('  price text elements:', $('*').filter((_, el) => $(el).clone().children().remove().end().text().trim().startsWith('$')).map((_, el) => $(el).text().trim()).get().slice(0, 3));
    }
  }
}

testWhySkipped();
