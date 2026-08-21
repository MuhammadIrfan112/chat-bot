async function inspectPropertySitemap() {
  const smUrls = [
    'https://century21sgr.com/sitemap-properties-dpages--0.xml',
    'https://century21sgr.com/sitemap-properties-dpages--1.xml',
    'https://century21sgr.com/sitemap-static.xml',
    'https://century21sgr.com/sitemap-agent-dpages.xml',
    'https://century21sgr.com/sitemap-developments-dpages.xml'
  ];

  for (const url of smUrls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`\nURL: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        const urls = text.match(/<loc>(.*?)<\/loc>/g)?.map(l => l.replace(/<\/?loc>/g, '')) || [];
        console.log(`Found ${urls.length} URLs in this sitemap.`);
        console.log('Sample 10:', urls.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    }
  }
}

inspectPropertySitemap();
