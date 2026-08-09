import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { name, email, password, phone, industry } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into users_subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 365); // 1 year trial by default for superadmin created
    
    const { error: subError } = await supabaseAdmin.from('users_subscription').insert({
      user_id: userId,
      status: 'Active',
      email: email,
      plan: 'premium',
      trial_ends_at: trialEndDate.toISOString()
    });

    if (subError) {
      // Log but don't fail — user is created in Auth, subscription insert is secondary
      console.error("Sub insert error (non-fatal):", subError.message);
    }

    // 3. Create a default chatbot
    const { data: botData, error: botError } = await supabaseAdmin.from('bots').insert({
      user_id: userId,
      name: name, // Using client name as default agent name
      industry: industry || 'Real Estate',
      welcome_message: 'Hi there! 👋 Welcome to RealtyPropFlow. How can I assist you with your real estate journey today?',
      primary_color: '#4F46E5',
      bot_avatar: '🤖',
      status: 'Active'
    }).select().single();

    if (botError) {
      return Response.json({ error: "User created but failed to create bot." }, { status: 500 });
    }

    return Response.json({ success: true, bot: botData });
  } catch (error) {
    console.error("Add Client Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
