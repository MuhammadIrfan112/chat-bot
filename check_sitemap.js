async function checkSitemap() {
  const sitemaps = [
    'https://century21sgr.com/sitemap.xml',
    'https://century21sgr.com/sitemap_index.xml',
    'https://century21sgr.com/properties-sitemap.xml',
    'https://century21sgr.com/robots.txt'
  ];

  for (const sm of sitemaps) {
    try {
      const res = await fetch(sm, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      console.log(`${sm} -> Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Length: ${text.length}`);
        const propertyMatches = text.match(/https?:\/\/[^\s<>"']+\/properties\/[^\s<>"']+/g) || [];
        console.log(`Properties links in ${sm}: ${propertyMatches.length}`);
        if (propertyMatches.length > 0) {
          console.log('Sample:', propertyMatches.slice(0, 10));
        } else {
          console.log('Sample text:', text.slice(0, 500));
        }
      }
    } catch (e) {
      console.error(`Error on ${sm}:`, e.message);
    }
  }
}

checkSitemap();
