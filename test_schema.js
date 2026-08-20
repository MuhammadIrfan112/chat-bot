async function run() {
  const r = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-zip-search?token=${process.env.APIFY_API_TOKEN || 'YOUR_TOKEN_HERE'}`);
  const d = await r.json();
  console.log(JSON.stringify(d.data.exampleRunInput, null, 2));
}
run();
