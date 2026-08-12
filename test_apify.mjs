import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testApify() {
  const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_TOKEN) {
    console.error('APIFY_API_TOKEN is missing in .env.local');
    return;
  }

  // 1. Simulate what startApifyRun does for "Toronto, ON" - Buy
  const searchUrl = 'https://www.zillow.com/toronto-on/homes/?searchQueryState=%7B%22pagination%22%3A%7B%7D%2C%22isMapVisible%22%3Afalse%2C%22filterState%22%3A%7B%22isForSaleByOwner%22%3A%7B%22value%22%3Afalse%7D%2C%22isForSaleByAgent%22%3A%7B%22value%22%3Atrue%7D%7D%2C%22isListVisible%22%3Atrue%2C%22mapZoom%22%3A11%7D';
  
  console.log('🚀 Triggering Apify Scraper for Toronto, ON (Buy)...');
  
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchUrls: [{ url: searchUrl }],
        maxItems: 4,
        proxy: { useApifyProxy: true }
      })
    }
  );

  const runData = await runRes.json();
  const runId = runData?.data?.id;
  
  if (!runId) {
    console.error('❌ Failed to start Apify run:', runData);
    return;
  }
  console.log(`✅ Apify Run Started! Run ID: ${runId}`);
  console.log('⏳ Waiting for Apify to scrape properties (this takes 20-30 seconds)...');

  // 2. Poll our local API to see if it maps it correctly
  let done = false;
  let attempts = 0;
  
  while (!done && attempts < 15) {
    attempts++;
    await new Promise(r => setTimeout(r, 5000));
    
    try {
      const pollRes = await fetch(`http://localhost:3000/api/apify-result?runId=${runId}&intent=buy`);
      const pollData = await pollRes.json();
      
      console.log(`[Attempt ${attempts}] Status: ${pollData.status}`);
      
      if (pollData.status === 'done') {
        console.log('\n🎉 SUCCESS! Extracted Live Properties:');
        console.log(JSON.stringify(pollData.properties, null, 2));
        done = true;
      } else if (pollData.status === 'failed' || pollData.status === 'empty') {
        console.log(`❌ Scraper Finished with status: ${pollData.status}`);
        done = true;
      }
    } catch (e) {
      console.log(`⚠️ Localhost error (make sure npm run dev is running): ${e.message}`);
    }
  }
}

testApify();
