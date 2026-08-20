import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // Fetch all bots — demo bots are NOT stored in DB (they're code-only), so no filter needed
    const { data: allBots, error: fetchError } = await supabaseAdmin
      .from('bots')
      .select('id, name, industry, website_url');

    if (fetchError) {
      return Response.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!allBots || allBots.length === 0) {
      return Response.json({ success: true, fixed: 0, message: 'No bots found.' });
    }

    // Only fix bots where industry is NOT already 'Real Estate'
    const needsFix = allBots.filter(b => b.industry !== 'Real Estate');
    const alreadyOk = allBots.length - needsFix.length;

    if (needsFix.length === 0) {
      return Response.json({
        success: true,
        fixed: 0,
        total: allBots.length,
        alreadyOk,
        message: 'All bots already have industry = Real Estate ✅'
      });
    }

    const ids = needsFix.map(b => b.id);

    // Only update industry — bots table does NOT have a plan column
    const { error: updateError } = await supabaseAdmin
      .from('bots')
      .update({ industry: 'Real Estate' })
      .in('id', ids);

    if (updateError) {
      return Response.json({ success: false, error: updateError.message }, { status: 500 });
    }

    const log = needsFix.map(b => `✅ Fixed: ${b.name} — was industry="${b.industry || 'NULL'}"`);

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
