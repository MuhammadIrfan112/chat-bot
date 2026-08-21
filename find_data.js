const cheerio = require('cheerio');

async function findApiOrData() {
  const url = 'https://century21sgr.com/properties/sale';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
  });
  const html = await res.text();

  // Search for JSON strings or API endpoints in HTML
  const regexes = [
    /https?:\/\/[^\s"']+\/api\/[^\s"']+/g,
    /https?:\/\/[^\s"']+\.json/g,
    /"properties"\s*:\s*\[/g,
    /"listings"\s*:\s*\[/g,
    /window\.__INITIAL_STATE__/g,
    /window\.PAGE_DATA/g,
    /media-production\.lp-cdn\.com/g,
    /lp-cdn\.com/g
  ];

  regexes.forEach(r => {
    const matches = html.match(r);
    console.log(`Pattern ${r}: found ${matches ? matches.length : 0}`);
    if (matches && matches.length > 0) {
      console.log('Sample:', matches.slice(0, 5));
    }
  });

  // Check all script tags
  const $ = cheerio.load(html);
  $('script').each((i, el) => {
    const t = $(el).text();
    if (t.includes('1444 W Barry') || t.includes('180 N Smith') || t.includes('property-list')) {
      console.log(`\n--- SCRIPT ${i} contains listing data! Length: ${t.length} ---`);
      console.log(t.slice(0, 1000));
    }
  });
}

findApiOrData();
