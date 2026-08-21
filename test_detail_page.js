const cheerio = require('cheerio');

async function testPropertyDetailPage() {
  const url = 'https://century21sgr.com/properties/1444-w-barry-street-chicago-il-us-60657-mrd12736115';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  console.log('Title:', $('title').text());
  console.log('H1/H2:', $('h1, h2, h3, h4').map((i, el) => $(el).text().trim()).get());

  // Check JSON-LD schema
  $('script[type="application/ld+json"]').each((i, el) => {
    console.log('\n--- JSON-LD Schema ---');
    console.log($(el).text());
  });

  // Check OpenGraph meta tags
  console.log('\n--- Meta Tags ---');
  $('meta[property^="og:"], meta[name^="twitter:"]').each((i, el) => {
    console.log($(el).attr('property') || $(el).attr('name'), ':', $(el).attr('content'));
  });

  // Check gallery images
  const imgs = [];
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-highres');
    if (src && (src.includes('cloudfront') || src.includes('lp-cdn') || src.includes('jpg') || src.includes('png') || src.includes('webp'))) {
      imgs.push(src);
    }
  });
  console.log('\n--- Found Images (count:', imgs.length, ') ---');
  console.log(imgs.slice(0, 8));
}

testPropertyDetailPage();
