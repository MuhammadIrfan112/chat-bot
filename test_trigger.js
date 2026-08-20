const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "YOUR_APIFY_TOKEN_HERE";

async function testTrigger() {
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/maxcopell~zillow-zip-search/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCodes: ["90001", "90002"],
          status: "forSale",
          maxItems: 4,
          proxy: { useApifyProxy: true }
        })
      }
    );
    const runData = await runRes.json();
    console.log("Run trigger response:", runData);
  } catch (e) {
    console.error(e);
  }
}
testTrigger();
