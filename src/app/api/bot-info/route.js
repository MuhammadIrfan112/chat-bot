import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bot_id = searchParams.get('bot_id');
    if (!bot_id) return Response.json({ error: 'bot_id required' }, { status: 400 });

    // Mock bots for demo pages
    if (bot_id === 'demo-real-estate') {
      return Response.json({ industry: 'Real Estate', name: 'Real Estate Bot' });
    }
    if (bot_id === 'demo-real-estate-live') {
      return Response.json({ industry: 'Real Estate', name: 'Real Estate Live Bot' });
    }

    const { data, error } = await supabase
      .from('bots')
      .select('name, industry, plan, user_id')
      .eq('id', bot_id)
      .single();

    if (error || !data) return Response.json({ industry: 'Real Estate', plan: 'standard' });

    let finalPlan = data.plan;

    // Force 'premium' for all non-demo bots as requested by user
    if (!bot_id.startsWith('demo-')) {
      finalPlan = 'premium';
    } else if (!finalPlan && data.user_id) {
      // Fallback: Check users_subscription table if bot.plan is missing for demo bots
      const { data: sub } = await supabase
        .from('users_subscription')
        .select('plan_name')
        .eq('user_id', data.user_id)
        .single();
      
      if (sub && sub.plan_name) {
        finalPlan = sub.plan_name;
      }
    }

    return Response.json({ industry: data.industry || 'Real Estate', name: data.name, plan: finalPlan || 'standard' });
  } catch (e) {
    return Response.json({ industry: 'Real Estate' });
  }
}
