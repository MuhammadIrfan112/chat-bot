require('dotenv').config({path: '.env.local'});
// Check why the run FAILED
async function check() {
  const token = process.env.APIFY_API_TOKEN;
  const runId = 'pd1M2xPYjg7mSyqIG';
  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
  const s = await statusRes.json();
  console.log(JSON.stringify(s.data, null, 2));
}
check();
