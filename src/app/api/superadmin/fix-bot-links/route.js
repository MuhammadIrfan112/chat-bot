import { supabaseAdmin } from '@/lib/supabaseAdmin';

// This API fixes all existing users who have a bot but no bot_id in users_subscription
export async function POST(req) {
  try {
    // Get all users who have no bot_id in subscription
    const { data: usersWithoutBotId } = await supabaseAdmin
      .from('users_subscription')
      .select('user_id')
      .is('bot_id', null);

    if (!usersWithoutBotId || usersWithoutBotId.length === 0) {
      return Response.json({ success: true, message: 'All users already have bot_id linked', fixed: 0 });
    }

    let fixed = 0;
    let failed = 0;
    const log = [];

    for (const sub of usersWithoutBotId) {
      // Find their bot
      const { data: bots } = await supabaseAdmin
        .from('bots')
        .select('id')
        .eq('user_id', sub.user_id)
        .limit(1);

      if (bots && bots.length > 0) {
        const botId = bots[0].id;
        const { error } = await supabaseAdmin
          .from('users_subscription')
          .update({ bot_id: botId })
          .eq('user_id', sub.user_id);

        if (error) {
          failed++;
          log.push(`FAIL user=${sub.user_id}: ${error.message}`);
        } else {
          fixed++;
          log.push(`FIXED user=${sub.user_id} → bot_id=${botId}`);
        }
      } else {
        log.push(`SKIP user=${sub.user_id}: no bot found`);
      }
    }

    return Response.json({ success: true, fixed, failed, log });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
