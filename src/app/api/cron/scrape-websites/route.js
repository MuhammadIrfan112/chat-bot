import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export const maxDuration = 60; // 60 seconds (max for Hobby)
export const runtime = 'nodejs';

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "RealtyPropFlow-cron-2026";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all Agent Profile Data from Knowledge Base
    const { data: profiles, error } = await supabase
      .from("knowledge_base")
      .select("bot_id, content")
      .eq("source", "Agent Profile Data");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: "No profiles found." });
    }

    const results = [];
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    // 2. Loop through profiles and find websites
    for (const profile of profiles) {
      if (!profile.content) continue;
      try {
        const parsed = JSON.parse(profile.content);
        if (parsed.website_url) {
          // 3. Trigger the scrape-website API for this bot
          // Note: Vercel might kill background tasks when the main response is returned, 
          // so we await it but put a short timeout to prevent the whole cron from failing.
          console.log(`[Cron] Syncing website for bot: ${profile.bot_id} -> ${parsed.website_url}`);
          const res = await fetch(`${baseUrl}/api/bot/scrape-website`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: parsed.website_url, bot_id: profile.bot_id }),
            signal: AbortSignal.timeout(10000) // max 10 seconds per site
          });
          
          if (res.ok) {
            results.push({ bot_id: profile.bot_id, url: parsed.website_url, status: "success" });
          } else {
            results.push({ bot_id: profile.bot_id, url: parsed.website_url, status: "failed", statusText: res.statusText });
          }
        }
      } catch (err) {
        results.push({ bot_id: profile.bot_id, status: "error", message: err.message });
      }
    }

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
