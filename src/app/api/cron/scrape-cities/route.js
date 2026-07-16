import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "botflow-cron-2026";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: kbEntries } = await supabase
      .from("knowledge_base")
      .select("content")
      .eq("source", "Agent Onboarding Profile");

    if (!kbEntries || kbEntries.length === 0) {
      return NextResponse.json({ message: "No agents found." });
    }

    const allCities = new Set();
    kbEntries.forEach(entry => {
      const match = entry.content.match(/Service Cities:\s*(.+)/);
      if (match) {
        match[1].split(",").forEach(city => {
          const trimmed = city.trim();
          if (trimmed) allCities.add(trimmed.toLowerCase());
        });
      }
    });

    if (allCities.size === 0) {
      return NextResponse.json({ message: "No cities found in agent profiles." });
    }

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const city of allCities) {
      const { data: existing } = await supabase
        .from("city_property_data")
        .select("last_scraped_at")
        .eq("city", city)
        .single();

      if (existing?.last_scraped_at) {
        const lastScraped = new Date(existing.last_scraped_at).toISOString().split("T")[0];
        if (lastScraped === today) {
          results.push({ city, status: "skipped", reason: "Already scraped today" });
          continue;
        }
      }

      try {
        const apifyToken = process.env.APIFY_API_TOKEN;
        const actorId = "maxcopell~zillow-scraper";
        
        const runRes = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ searchTerm: city, maxItems: 20, type: "sale" })
          }
        );

        if (!runRes.ok) {
          results.push({ city, status: "error", reason: `Apify returned ${runRes.status}` });
          continue;
        }

        const properties = await runRes.json();

        await supabase
          .from("city_property_data")
          .upsert({ city, properties: properties || [], last_scraped_at: new Date().toISOString() }, { onConflict: "city" });

        results.push({ city, status: "scraped", count: properties?.length || 0 });
      } catch (err) {
        results.push({ city, status: "error", reason: err.message });
      }
    }

    return NextResponse.json({ success: true, date: today, total_cities: allCities.size, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
