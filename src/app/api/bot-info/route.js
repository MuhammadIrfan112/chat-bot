import { supabase } from '@/lib/supabaseClient';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const bot_id = searchParams.get('bot_id');
    if (!bot_id) return Response.json({ error: 'bot_id required' }, { status: 400 });

    // Mock bots for demo pages
    if (bot_id === 'demo-real-estate') {
      return Response.json({ industry: 'Real Estate', name: 'Real Estate Bot' });
    }
    if (bot_id === 'demo-ecommerce') {
      return Response.json({ industry: 'E-Commerce', name: 'E-Commerce Bot' });
    }

    const { data, error } = await supabase
      .from('bots')
      .select('name, industry, plan')
      .eq('id', bot_id)
      .single();

    if (error || !data) return Response.json({ industry: 'Real Estate', plan: 'standard' });
    return Response.json({ industry: data.industry || 'Real Estate', name: data.name, plan: data.plan || 'standard' });
  } catch (e) {
    return Response.json({ industry: 'Real Estate' });
  }
}
