require('dotenv').config({path: '.env.local'});
async function test() {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/katerinahradilova~realtor-scraper/runs?token=${process.env.APIFY_API_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: "Chicago, IL", maxItems: 4 }) }
  );
  const json = await runRes.json();
  console.log(json);
}
test();
