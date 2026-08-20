/**
 * 🤖 SHAWNA ROONGSANG BOT LIVE TEST
 * Bot ID: 52d4860c-8eba-4d8c-8d23-7c114bc0ccfc
 * This bot has NO website properties and NO CRM properties.
 * It MUST trigger Apify live Zillow scraper and return real live properties.
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const VERCEL_URL  = 'https://realtypropflow.com';
const BOT_ID      = '52d4860c-8eba-4d8c-8d23-7c114bc0ccfc'; // Shawna Roongsang
const APIFY_TOKEN = process.env.APIFY_API_TOKEN?.trim();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callChatAPI(messages) {
  const res = await fetch(`${VERCEL_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, bot_id: BOT_ID, plan: 'premium', is_demo: false, session_id: null })
  });
  return res.json();
}

async function pollApifyResult(runId, intent = 'buy') {
  console.log(`\n⏳ Polling Apify run (${runId}) every 5 seconds...`);
  for (let i = 0; i < 20; i++) {
    await sleep(5000);
    const res = await fetch(`${VERCEL_URL}/api/apify-result?runId=${runId}&intent=${intent}`);
    const data = await res.json();
    process.stdout.write(`  [${(i+1)*5}s] ${data.status} `);

    if (data.status === 'running' || data.status === 'RUNNING' || data.status === 'READY') {
      process.stdout.write('🔄\n');
      continue;
    }
    if (data.properties?.length > 0 || data.status === 'done') {
      console.log('\n\n🎉 SUCCESS! REAL LIVE ZILLOW PROPERTIES RECEIVED FOR SHAWNA BOT:');
      console.log(`Total Scraped Properties: ${data.properties?.length || 0}\n`);
      (data.properties || []).slice(0, 4).forEach((p, idx) => {
        console.log(`  🏡 Property ${idx+1}:`);
        console.log(`     📍 Address: ${p.address}`);
        console.log(`     💰 Price:   ${p.price}`);
        console.log(`     🛏  Beds:    ${p.bedrooms} | 🛁 Baths: ${p.bathrooms}`);
        console.log(`     🖼  Image:   ${p.image_url ? p.image_url.substring(0, 70) + '...' : '❌ No Image'}`);
        console.log(`     🔗 Zillow:  ${(p.url || '').substring(0, 65)}...`);
        console.log('');
      });
      return true;
    }
    if (data.status === 'failed' || data.status === 'empty') {
      console.log(`\n❌ Apify result status: ${data.status}`);
      return false;
    }
  }
  console.log('\n⚠️ Timeout after 100s');
  return false;
}

async function main() {
  console.log('====================================================');
  console.log('  🤖 TESTING SHAWNA ROONGSANG BOT (LIVE APIFY TEST) ');
  console.log('====================================================');
  console.log(`Bot ID: ${BOT_ID}`);
  console.log(`Target: ${VERCEL_URL}`);
  console.log(`Token:  ${APIFY_TOKEN?.substring(0, 22)}...`);
  console.log('');

  const summaryText = `Here's what I have for your home search:
Location: Morton Grove
Property: Family Home
Bedrooms: 4
Bathrooms: 3
Important features: None
School preference: None
Maximum budget: 600k
First-time buyer: Yes
Mortgage: Pre-approved
Purchase timeline: Within 3 months
Currently working with an agent: No

Does everything look correct?
[BUTTON: Yes] [BUTTON: No]`;

  const messages = [
    { role: 'user',  parts: [{ text: "I'm looking to buy a home" }] },
    { role: 'model', parts: [{ text: "Are you looking for a family home or an investment property?" }] },
    { role: 'user',  parts: [{ text: "Family Home" }] },
    { role: 'model', parts: [{ text: "Which city or area are you interested in?" }] },
    { role: 'user',  parts: [{ text: "Morton Grove" }] },
    { role: 'model', parts: [{ text: "What type of home are you looking for?" }] },
    { role: 'user',  parts: [{ text: "Detached" }] },
    { role: 'model', parts: [{ text: "How many bedrooms are you looking for?" }] },
    { role: 'user',  parts: [{ text: "4" }] },
    { role: 'model', parts: [{ text: "And how many bathrooms?" }] },
    { role: 'user',  parts: [{ text: "3" }] },
    { role: 'model', parts: [{ text: "Are you a first-time buyer?" }] },
    { role: 'user',  parts: [{ text: "Yes" }] },
    { role: 'model', parts: [{ text: "Are there any important features you're looking for?" }] },
    { role: 'user',  parts: [{ text: "None" }] },
    { role: 'model', parts: [{ text: "Do you have any specific school requirements?" }] },
    { role: 'user',  parts: [{ text: "None" }] },
    { role: 'model', parts: [{ text: "What is your maximum budget?" }] },
    { role: 'user',  parts: [{ text: "600k" }] },
    { role: 'model', parts: [{ text: "When are you planning to purchase?" }] },
    { role: 'user',  parts: [{ text: "Within 3 months" }] },
    { role: 'model', parts: [{ text: "Have you been pre-approved for a mortgage?" }] },
    { role: 'user',  parts: [{ text: "Yes" }] },
    { role: 'model', parts: [{ text: "Are you currently working with any other real estate agent?" }] },
    { role: 'user',  parts: [{ text: "No" }] },
    { role: 'model', parts: [{ text: summaryText }] },
    { role: 'user',  parts: [{ text: "Yes" }] }
  ];

  console.log('📤 Sending user confirmation to Shawna bot API...');
  const result = await callChatAPI(messages);

  console.log('\n📨 API Response received:');
  console.log('   apifyRunId:', result.apifyRunId || 'NULL ❌');
  console.log('   intent:', result.intent || 'NULL');
  console.log('   reply:', (result.reply || result.error || '').substring(0, 250));

  if (result.apifyRunId) {
    console.log('\n🚀 APIFY LIVE SCRAPER STARTED SUCCESSFULLY!');
    console.log(`   Run ID: ${result.apifyRunId}`);
    const success = await pollApifyResult(result.apifyRunId, result.intent || 'buy');
    if (success) {
      console.log('✅ TEST COMPLETE: Live properties scraped and delivered to frontend!');
    }
  } else {
    console.log('\n❌ Apify runId was null.');
  }
}

main().catch(console.error);
