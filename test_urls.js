require('dotenv').config({path: '.env.local'});
async function testUrls() {
  const token = process.env.APIFY_API_TOKEN;
  
  const urlsToTest = [
    "https://www.zillow.com/homes/Chicago,-IL_rb/",
    "https://www.zillow.com/chicago-il/",
    "https://www.zillow.com/chicago-il/rentals/",
    "https://www.zillow.com/homes/for_sale/Chicago,-IL_rb/"
  ];
  
  for (let i = 0; i < urlsToTest.length; i++) {
    console.log(`\nTesting URL ${i+1}: ${urlsToTest[i]}`);
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-scraper/runs?token=${token}`,
      { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          searchUrls: [{ url: urlsToTest[i] }], 
          maxItems: 2,
          proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
        }) 
      }
    );
    const json = await runRes.json();
    const runId = json.data?.id;
    console.log("RUN ID:", runId);
    
    if (runId) {
      // Wait for it to finish or fail
      let finished = false;
      for (let j = 0; j < 5; j++) {
        await new Promise(r => setTimeout(r, 6000));
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        const s = await statusRes.json();
        if (s.data?.status === 'SUCCEEDED' || s.data?.status === 'FAILED') {
          console.log(`Status: ${s.data.status} - ${s.data.statusMessage || ''}`);
          finished = true;
          break;
        }
      }
      if (!finished) console.log("Status: Still running...");
    }
  }
}
testUrls();
