import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "RealtyPropFlow-cron-2026";
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
        const actorId = "solidcode~realtorca-scraper";
        
        const runRes = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location: city + ", Ontario", listingType: "sale", maxItems: 50 })
          }
        );

        if (!runRes.ok) {
          results.push({ city, status: "error", reason: `Apify returned ${runRes.status}` });
          continue;
        }

        const rawProperties = await runRes.json();
        
        // Map the raw data to a standardized format
        const properties = rawProperties.map(p => {
          let imgs = [];
          if (p.photos && Array.isArray(p.photos)) {
            imgs = p.photos.slice(0, 6);
          }
          return {
            mls_number: p.mlsNumber || p.listingId || Math.random().toString(36).substring(7),
            price: p.price || 'Contact for Price',
            address: p.address || 'Address Not Disclosed',
            city: p.city || city,
            province: p.province || 'ON',
            bedrooms: p.bedrooms || 'N/A',
            bathrooms: p.bathrooms || 'N/A',
            property_type: p.propertyType || 'Residential',
            images: imgs, // We save the image URL from Apify here
            url: p.listingUrl || ''
          };
        }).filter(p => p.price && p.url); // Keep only valid ones

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

