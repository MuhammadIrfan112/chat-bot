require('dotenv').config({path: '.env.local'});

// Test RapidAPI Zillow API - direct API (not scraping), Zillow nahi rok sakta
// Free tier: 100 calls/day
async function test() {
  const RAPID_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPID_KEY) {
    console.log('RAPIDAPI_KEY not set in .env.local - please add it');
    console.log('Get free key at: https://rapidapi.com/s.mahmoud97/api/zillow56');
    return;
  }
  
  const res = await fetch('https://zillow56.p.rapidapi.com/search?location=Chicago%2C%20IL&status=forSale&sortSelection=priorityscore&listing_type=by_agent&doz=any', {
    headers: {
      'x-rapidapi-host': 'zillow56.p.rapidapi.com',
      'x-rapidapi-key': RAPID_KEY
    }
  });
  
  const json = await res.json();
  console.log("STATUS:", res.status);
  console.log("Results:", json?.results?.length || 0);
  if (json?.results?.length > 0) {
    const p = json.results[0];
    console.log("First property:", p.address, "-", p.price, "-", p.bedrooms, "bed");
  }
}
test();
