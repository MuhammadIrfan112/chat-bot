const cheerio = require('cheerio');

async function findActiveProperties() {
  const urls = [
    'https://century21sgr.com',
    'https://century21sgr.com/properties/sale',
    'https://century21sgr.com/properties/sold',
    'https://century21sgr.com/our-listings',
    'https://century21sgr.com/featured-listings',
    'https://century21sgr.com/home-search/listings',
    'https://century21sgr.com/buyers',
    'https://century21sgr.com/sellers'
  ];

  // Also check all 115 agents pages!
  // On agent pages (e.g. /agent/aaron-lopez), each agent has their own active listings!
  const agentSitemapRes = await fetch('https://century21sgr.com/sitemap-agent-dpages.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const agentXml = await agentSitemapRes.text();
  const agentUrls = agentXml.match(/<loc>(.*?)<\/loc>/g)?.map(l => l.replace(/<\/?loc>/g, '')) || [];
  console.log(`Found ${agentUrls.length} agent pages.`);

  const activePropertyLinks = new Set();

  for (const pageUrl of [...urls, ...agentUrls.slice(0, 30)]) {
    try {
      const res = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const abs = new URL(href, 'https://century21sgr.com').href;
            if (abs.includes('century21sgr.com/properties/') && !abs.endsWith('/sale') && !abs.endsWith('/sold') && !abs.endsWith('/rent')) {
              activePropertyLinks.add(abs);
            }
          } catch (e) {}
        }
      });
    } catch (e) {}
  }

  console.log(`Discovered ${activePropertyLinks.size} unique active property links across main + agent pages.`);
  console.log('Sample 20:', Array.from(activePropertyLinks).slice(0, 20));
}

findActiveProperties();
