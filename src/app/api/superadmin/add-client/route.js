import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req) {
  const debugLog = [];
  
  try {
    const { name, email, password, phone, website_url } = await req.json();
    // Industry is always 'Real Estate' — hardcoded, never NULL, never overridable
    debugLog.push(`Input: name=${name}, email=${email}, website=${website_url}`);

    if (!email || !password || !name || !website_url) {
      return Response.json({ error: "Name, email, password, and website_url are required" }, { status: 400 });
    }

    // 1. Try to create the user in Auth
    let userId;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      debugLog.push(`Auth error: ${authError.message}`);
      // If user already exists, find them
      if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('exists')) {
        // Find existing user ID by querying auth.admin.listUsers
        let existingUser = null;
        let page = 1;
        while (true) {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          if (listError || !listData?.users || listData.users.length === 0) break;
          existingUser = listData.users.find(u => u.email === email);
          if (existingUser) break;
          if (listData.users.length < 1000) break; // no more pages
          page++;
        }
        
        if (!existingUser) {
          return Response.json({ error: authError.message, debug: debugLog }, { status: 400 });
        }
        userId = existingUser.id;
        debugLog.push(`Found existing auth user: ${userId}`);
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      } else {
        return Response.json({ error: authError.message, debug: debugLog }, { status: 400 });
      }
    } else {
      userId = authData.user.id;
      debugLog.push(`New auth user created: ${userId}`);
    }

    // 2. Safely add to users_subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 15);
    
    // Check if subscription exists first
    const { data: existingSubData, error: subCheckErr } = await supabaseAdmin
      .from('users_subscription')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    debugLog.push(`Sub check result: existingSubData=${JSON.stringify(existingSubData)}, err=${subCheckErr?.message}`);

    let subError;
    if (existingSubData) {
      // Update existing
      const res = await supabaseAdmin.from('users_subscription').update({
        status: 'Active',
        plan: 'premium',
        website_url: website_url,
        trial_ends_at: trialEndDate.toISOString()
      }).eq('user_id', userId);
      subError = res.error;
      debugLog.push(`Sub UPDATE result: err=${subError?.message}`);
    } else {
      // Insert new
      const res = await supabaseAdmin.from('users_subscription').insert({
        user_id: userId,
        status: 'Active',
        email: email,
        plan: 'premium',
        website_url: website_url,
        trial_ends_at: trialEndDate.toISOString()
      });
      subError = res.error;
      debugLog.push(`Sub INSERT result: err=${subError?.message}`);
    }

    if (subError) {
      // This is now FATAL — we need to know if it fails
      return Response.json({ 
        error: `Failed to save subscription: ${subError.message}`, 
        debug: debugLog 
      }, { status: 500 });
    }

    // 3. Check if bot already exists
    const { data: existingBots } = await supabaseAdmin.from('bots').select('*').eq('user_id', userId).limit(1);
    
    if (existingBots && existingBots.length > 0) {
      debugLog.push(`Bot already exists: ${existingBots[0].id}`);
      // Also fix industry in case it was created before this rule
      await supabaseAdmin.from('bots').update({ industry: 'Real Estate' }).eq('id', existingBots[0].id);
      return Response.json({ success: true, bot: { ...existingBots[0], industry: 'Real Estate' }, debug: debugLog });
    }

    // 4. Create a default chatbot — industry is ALWAYS 'Real Estate', plan is ALWAYS 'premium'
    const { data: botData, error: botError } = await supabaseAdmin.from('bots').insert({
      user_id: userId,
      name: `${name}'s Assistant`,
      company_name: `${name} Real Estate`,
      industry: 'Real Estate',
      website_url: website_url,
      welcome_message: `Hi there! 👋 I'm ${name}'s AI assistant. How can I help you today?`,
      system_prompt: `You are an AI assistant for ${name}. Be helpful and professional.`,
      primary_color: '#4F46E5',
      bot_avatar: '🤖',
      status: 'Active'
    }).select().single();

    if (botError) {
      return Response.json({ error: "User created but failed to create bot: " + botError.message, debug: debugLog }, { status: 500 });
    }

    debugLog.push(`Bot created: ${botData.id}`);

    // 5. CRITICAL: Save bot_id back to users_subscription so dashboard can find it
    const { error: linkError } = await supabaseAdmin
      .from('users_subscription')
      .update({ bot_id: botData.id })
      .eq('user_id', userId);

    if (linkError) {
      debugLog.push(`Warning: Bot created but failed to link bot_id to subscription: ${linkError.message}`);
    } else {
      debugLog.push(`Bot linked to subscription: bot_id=${botData.id}`);
    }

    return Response.json({ success: true, bot: botData, debug: debugLog });
  } catch (error) {
    console.error("Add Client Error:", error);
    return Response.json({ error: error.message, debug: debugLog }, { status: 500 });
  }
}
