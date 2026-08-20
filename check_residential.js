require('dotenv').config({path: '.env.local'});
async function check() {
  const datasetId = '8bcYYclSIcbOa1mhi';
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`);
  const items = await itemsRes.json();
  console.log("ITEMS COUNT:", items.length);
  if (items.length > 0) {
    console.log(JSON.stringify(items[0], null, 2).substring(0, 500));
  }
}
check();
