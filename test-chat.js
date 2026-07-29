require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log("Testing chat API directly...");
  
  const bot_id = "97d9a6c7-0842-4915-83ad-4cf3ee494cf8"; // Using the user's bot ID
  const payload = {
    messages: [
      { role: "user", parts: [{ text: "Hi, I am looking for a family home in Milton." }] },
      { role: "model", parts: [{ text: "Great! How many bedrooms?" }] },
      { role: "user", parts: [{ text: "3 bedrooms, 3 bathrooms." }] },
      { role: "model", parts: [{ text: "First time buyer?" }] },
      { role: "user", parts: [{ text: "Yes" }] },
      { role: "model", parts: [{ text: "School preferences?" }] },
      { role: "user", parts: [{ text: "No" }] },
      { role: "model", parts: [{ text: "Other features?" }] },
      { role: "user", parts: [{ text: "Garage" }] },
      { role: "model", parts: [{ text: "Budget?" }] },
      { role: "user", parts: [{ text: "$1,000,000" }] },
      { role: "model", parts: [{ text: "When to purchase?" }] },
      { role: "user", parts: [{ text: "Not decided" }] },
      { role: "model", parts: [{ text: "Pre-approved?" }] },
      { role: "user", parts: [{ text: "Yes" }] }
    ],
    bot_id: bot_id,
    session_id: "test-session"
  };

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("RESPONSE FROM AI:");
    console.log(data.reply);
  } catch(e) {
    console.error(e);
  }
}

test();
