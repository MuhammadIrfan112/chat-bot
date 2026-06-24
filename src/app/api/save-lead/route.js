import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
  try {
    const { name, email, phone_number, property_interest, chatbot_source, bot_id } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const insertData = { 
      name, 
      email, 
      phone_number: phone_number || null,
      property_interest: property_interest || null,
      chatbot_source: chatbot_source || 'Website'
    };
    if (bot_id) insertData.bot_id = bot_id;

    const { error } = await supabase
      .from('leads')
      .insert(insertData);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Lead Save Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
