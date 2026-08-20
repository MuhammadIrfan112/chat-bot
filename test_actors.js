require('dotenv').config({path: '.env.local'});
async function test() {
  const token = process.env.APIFY_API_TOKEN;
  const r = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-scraper?token=${token}`);
  const json = await r.json();
  console.log(JSON.stringify(json, null, 2));
}
test();
