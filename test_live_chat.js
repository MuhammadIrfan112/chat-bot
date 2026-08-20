/**
 * 🤖 CORRECT CHATBOT TEST SCRIPT v2
 * 
 * Simulates the EXACT message format the real Chatbot.js frontend sends.
 * The key insight: the frontend collects info locally, then sends the full 
 * chat history including the AI's summary message (containing "Location:"),
 * followed by the user saying "Yes".
 * 
 * This triggers route.js's recentSummary detection → hasEnoughInfo = true → Apify runs!
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const VERCEL_URL  = 'https://realtypropflow.com';
const BOT_ID      = 'd6854cbe-da0e-4040-a2f5-e9e862381205';
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
  console.log(`\n⏳ Polling Apify results (max 90s)...`);
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const res = await fetch(`${VERCEL_URL}/api/apify-result?runId=${runId}&intent=${intent}`);
    const data = await res.json();
    process.stdout.write(`  [${(i+1)*5}s] ${data.status} `);

    if (data.status === 'running' || data.status === 'RUNNING' || data.status === 'READY') {
      process.stdout.write('🔄\n');
      continue;
    }
    if (data.properties?.length > 0 || data.status === 'done') {
      console.log('\n\n✅ REAL ZILLOW PROPERTIES RECEIVED!');
      console.log(`Total: ${data.properties?.length || 0} properties\n`);
      (data.properties || []).slice(0, 3).forEach((p, i) => {
        console.log(`  📍 Property ${i+1}: ${p.address}`);
        console.log(`     💰 Price: ${p.price}`);
        console.log(`     🛏  Beds: ${p.bedrooms}  🛁 Baths: ${p.bathrooms}`);
        console.log(`     🖼  Image: ${p.image_url ? '✅' : '❌'}`);
        console.log(`     🔗 URL: ${(p.url || '').substring(0, 60)}...`);
        console.log('');
      });
      return true;
    }
    if (data.status === 'failed' || data.status === 'empty') {
      console.log(`\n❌ Apify result: ${data.status}`);
      return false;
    }
  }
  console.log('\n⚠️ Timeout after 90s');
  return false;
}

async function main() {
  console.log('=============================================');
  console.log('  🤖 CENTURY 21 CHATBOT CORRECT TEST v2   ');
  console.log('=============================================');
  console.log(`Target: ${VERCEL_URL}`);
  console.log(`Bot ID: ${BOT_ID}`);
  console.log(`Token:  ${APIFY_TOKEN?.substring(0, 22)}...`);
  console.log('');

  // =====================================================================
  // EXACT message format as the real Chatbot.js sends it.
  // The critical piece is the model's summary message which contains
  // "Location:" — this triggers recentSummary detection in route.js
  // =====================================================================
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
    // KEY: Summary message from bot (contains "Location:" which triggers recentSummary)
    { role: 'model', parts: [{ text: summaryText }] },
    // KEY: User confirms with "Yes"
    { role: 'user',  parts: [{ text: "Yes" }] }
  ];

  console.log('📤 Sending confirmed summary to API...');
  console.log('   (This is the critical "Yes" confirmation step)');
  
  const result = await callChatAPI(messages);
  
  console.log('\n📨 API Response:');
  console.log('   apifyRunId:', result.apifyRunId || 'NULL ❌');
  console.log('   intent:', result.intent || 'NULL');
  console.log('   reply (first 200 chars):', (result.reply || result.error || '').substring(0, 200));

  if (result.apifyRunId) {
    console.log('\n🚀 APIFY TRIGGERED! Run ID:', result.apifyRunId);
    console.log('   Waiting for Zillow to return real properties...\n');
    const success = await pollApifyResult(result.apifyRunId, result.intent || 'buy');
    if (success) {
      console.log('🎉 TEST PASSED — Live properties are working!');
    } else {
      console.log('⚠️  Apify ran but returned no properties (Zillow may have blocked)');
    }
  } else {
    console.log('\n❌ APIFY NOT TRIGGERED');
    console.log('   Possible causes:');
    console.log('   1. hasEnoughInfo = false (check detectedCity detection)');
    console.log('   2. plan = standard (should be premium)');
    console.log('   3. Bot subscription inactive');
    if (result.reply?.toLowerCase().includes('sorry')) {
      console.log('   ⚠️  Bot apologized — likely hit RULE C in Step 11');
    }
  }

  console.log('\n=============================================');
  console.log('              TEST COMPLETE                 ');
  console.log('=============================================');
}

main().catch(console.error);
