const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "YOUR_APIFY_TOKEN_HERE";

async function checkApify() {
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/maxcopell~zillow-zip-search/runs?token=${APIFY_TOKEN}&desc=true&limit=2`);
    if (!res.ok) {
      console.log("Fetch failed:", res.status, res.statusText);
      return;
    }
    const data = await res.json();
    for (const run of data.data.items) {
      console.log(`Run ID: ${run.id}, Status: ${run.status}, Dataset ID: ${run.defaultDatasetId}`);
      if (run.defaultDatasetId) {
        const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}`);
        const items = await datasetRes.json();
        console.log(`  -> Items scraped: ${items.length}`);
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

checkApify();
