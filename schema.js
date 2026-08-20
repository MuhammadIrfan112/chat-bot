async function run() {
  const r = await fetch('https://api.apify.com/v2/acts/maxcopell~zillow-scraper/input-schema');
  const d = await r.json();
  console.log(JSON.stringify(d, null, 2));
}
run();
