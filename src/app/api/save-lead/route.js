import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
  try {
    const { name, email, phone_number, property_interest, viewed_links, chatbot_source, bot_id, time_preference } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    let finalInterest = property_interest || '';
    if (time_preference) {
      finalInterest += `\n\nPreferred Callback Time:\n${time_preference}`;
    }
    if (viewed_links && viewed_links.length > 0) {
      finalInterest += `\n\nViewed Links:\n${viewed_links.join('\n')}`;
    }

    const insertData = { 
      name, 
      email, 
      phone_number: phone_number || null,
      property_interest: finalInterest || null,
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
