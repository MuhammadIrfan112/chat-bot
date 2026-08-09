import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  try {
    const { name, email, password, phone, industry } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    // 1. Try to create the user in Auth
    let userId;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      // If user already exists, find them
      if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('exists')) {
        // Find existing user ID by querying users_subscription
        const { data: existingSub } = await supabaseAdmin.from('users_subscription').select('user_id').eq('email', email).single();
        
        if (!existingSub) {
          // If we can't find their user_id, just return the error
          return Response.json({ error: authError.message }, { status: 400 });
        }
        userId = existingSub.user_id;
        
        // Update password for the existing user (optional, but requested by user to allow overriding)
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      } else {
        return Response.json({ error: authError.message }, { status: 400 });
      }
    } else {
      userId = authData.user.id;
    }

    // 2. Upsert into users_subscription (safe if already exists)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 365);
    
    const { error: subError } = await supabaseAdmin.from('users_subscription').upsert({
      user_id: userId,
      status: 'Active',
      email: email,
      plan: 'premium',
      trial_ends_at: trialEndDate.toISOString()
    }, { onConflict: 'user_id' });

    if (subError) {
      console.error("Sub insert error (non-fatal):", subError.message);
    }

    // 3. Check if bot already exists
    const { data: existingBots } = await supabaseAdmin.from('bots').select('*').eq('user_id', userId).limit(1);
    
    if (existingBots && existingBots.length > 0) {
      // Bot already exists — return it
      return Response.json({ success: true, bot: existingBots[0] });
    }

    // 4. Create a default chatbot
    const { data: botData, error: botError } = await supabaseAdmin.from('bots').insert({
      user_id: userId,
      name: name,
      industry: industry || 'Real Estate',
      welcome_message: 'Hi there! 👋 Welcome to RealtyPropFlow. How can I assist you with your real estate journey today?',
      primary_color: '#4F46E5',
      bot_avatar: '🤖',
      status: 'Active'
    }).select().single();

    if (botError) {
      return Response.json({ error: "User created but failed to create bot: " + botError.message }, { status: 500 });
    }

    return Response.json({ success: true, bot: botData });
  } catch (error) {
    console.error("Add Client Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
