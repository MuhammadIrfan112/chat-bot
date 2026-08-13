require('dotenv').config({path: '.env.local'});
async function test() {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  const searchQueryState = JSON.stringify({ pagination: {}, isMapVisible: false, filterState: { isForSaleByOwner: { value: false }, isForSaleByAgent: { value: true } }, isListVisible: true, mapZoom: 11 });
  const searchUrl = `https://www.zillow.com/new-york-ny/homes/?searchQueryState=${encodeURIComponent(searchQueryState)}`;
  
  const runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${APIFY_TOKEN}`,
      { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          searchUrls: [{ url: searchUrl }], 
          maxItems: 4, 
          proxy: { 
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"]
          } 
        }) 
      }
  );
  const json = await runRes.json();
  console.log("RESPONSE:", json);
}
test();
