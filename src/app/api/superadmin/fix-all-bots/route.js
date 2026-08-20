import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // Fetch all real bots (non-demo)
    const { data: allBots, error: fetchError } = await supabaseAdmin
      .from('bots')
      .select('id, name, industry, plan, website_url')
      .not('id', 'like', 'demo-%');

    if (fetchError) {
      return Response.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!allBots || allBots.length === 0) {
      return Response.json({ success: true, fixed: 0, message: 'No bots found.' });
    }

    const needsFix = allBots.filter(b => b.industry !== 'Real Estate' || b.plan !== 'premium');
    const alreadyOk = allBots.length - needsFix.length;

    if (needsFix.length === 0) {
      return Response.json({ success: true, fixed: 0, alreadyOk, message: 'All bots already have correct industry & plan.' });
    }

    const ids = needsFix.map(b => b.id);

    const { error: updateError } = await supabaseAdmin
      .from('bots')
      .update({ industry: 'Real Estate', plan: 'premium' })
      .in('id', ids);

    if (updateError) {
      return Response.json({ success: false, error: updateError.message }, { status: 500 });
    }

    const log = needsFix.map(b => `✅ Fixed: ${b.name} (${b.id}) — was industry="${b.industry || 'NULL'}", plan="${b.plan || 'NULL'}"`);

    return Response.json({
      success: true,
      total: allBots.length,
      fixed: needsFix.length,
      alreadyOk,
      log
    });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
