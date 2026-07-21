import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Use service role for write access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Full Ontario municipalities list
const ONTARIO_CITIES = [
  "Addington Highlands, Ontario",
  "Adelaide Metcalfe, Ontario",
  "Admaston/Bromley, Ontario",
  "Ajax, Ontario",
  "Algonquin Highlands, Ontario",
  "Alfred and Plantagenet, Ontario",
  "Alnwick/Haldimand, Ontario",
  "Amaranth, Ontario",
  "Amherstburg, Ontario",
  "Armour, Ontario",
  "Armstrong, Ontario",
  "Arnprior, Ontario",
  "Arran-Elderslie, Ontario",
  "Ashfield-Colborne-Wawanosh, Ontario",
  "Asphodel-Norwood, Ontario",
  "Assiginack, Ontario",
  "Athens, Ontario",
  "Atikokan, Ontario",
  "Augusta, Ontario",
  "Aurora, Ontario",
  "Aylmer, Ontario",
  "Baldwin, Ontario",
  "Bancroft, Ontario",
  "Barrie, Ontario",
  "Bayham, Ontario",
  "Beckwith, Ontario",
  "Belleville, Ontario",
  "Billings, Ontario",
  "Blind River, Ontario",
  "Blue Mountains, Ontario",
  "Bonfield, Ontario",
  "Bonnechere Valley, Ontario",
  "Bracebridge, Ontario",
  "Bradford West Gwillimbury, Ontario",
  "Brampton, Ontario",
  "Brant, Ontario",
  "Brantford, Ontario",
  "Brock, Ontario",
  "Brockton, Ontario",
  "Brockville, Ontario",
  "Bruce Mines, Ontario",
  "Burlington, Ontario",
  "Caledon, Ontario",
  "Callander, Ontario",
  "Calvin, Ontario",
  "Cambridge, Ontario",
  "Carleton Place, Ontario",
  "Casselman, Ontario",
  "Central Elgin, Ontario",
  "Central Frontenac, Ontario",
  "Central Huron, Ontario",
  "Central Manitoulin, Ontario",
  "Central Middlesex, Ontario",
  "Centre Hastings, Ontario",
  "Champlain, Ontario",
  "Chapleau, Ontario",
  "Chatham-Kent, Ontario",
  "Chatsworth, Ontario",
  "Clarington, Ontario",
  "Clearview, Ontario",
  "Cochrane, Ontario",
  "Collingwood, Ontario",
  "Cornwall, Ontario",
  "Cobourg, Ontario",
  "Cramahe, Ontario",
  "Clarence-Rockland, Ontario",
  "Deep River, Ontario",
  "Deseronto, Ontario",
  "Dutton/Dunwich, Ontario",
  "Dryden, Ontario",
  "Durham, Ontario",
  "Dysart et al., Ontario",
  "East Ferris, Ontario",
  "East Garafraxa, Ontario",
  "East Gwillimbury, Ontario",
  "East Hawkesbury, Ontario",
  "East Luther Grand Valley, Ontario",
  "East Zorra-Tavistock, Ontario",
  "Elizabethtown-Kitley, Ontario",
  "Elliot Lake, Ontario",
  "Espanola, Ontario",
  "Essa, Ontario",
  "Essex, Ontario",
  "Faraday, Ontario",
  "Fort Erie, Ontario",
  "Fort Frances, Ontario",
  "French River, Ontario",
  "Gananoque, Ontario",
  "Georgian Bay, Ontario",
  "Georgina, Ontario",
  "Goderich, Ontario",
  "Gore Bay, Ontario",
  "Grand Valley, Ontario",
  "Gravenhurst, Ontario",
  "Greater Napanee, Ontario",
  "Greater Sudbury, Ontario",
  "Grey Highlands, Ontario",
  "Guelph, Ontario",
  "Haldimand County, Ontario",
  "Haliburton, Ontario",
  "Hamilton, Ontario",
  "Hanover, Ontario",
  "Hastings Highlands, Ontario",
  "Hawkesbury, Ontario",
  "Hearst, Ontario",
  "Horton, Ontario",
  "Huntsville, Ontario",
  "Huron East, Ontario",
  "Ignace, Ontario",
  "Ingersoll, Ontario",
  "Innisfil, Ontario",
  "Iroquois Falls, Ontario",
  "Kapuskasing, Ontario",
  "Kawartha Lakes, Ontario",
  "Kearney, Ontario",
  "Kenora, Ontario",
  "Killaloe, Hagarty and Richards, Ontario",
  "Kincardine, Ontario",
  "King, Ontario",
  "Kingston, Ontario",
  "Kingsville, Ontario",
  "Kirkland Lake, Ontario",
  "Kitchener, Ontario",
  "Laurentian Hills, Ontario",
  "Laurentian Valley, Ontario",
  "Lake of Bays, Ontario",
  "Lakeshore, Ontario",
  "LaSalle, Ontario",
  "Leeds and the Thousand Islands, Ontario",
  "Loyalist, Ontario",
  "London, Ontario",
  "Lucan Biddulph, Ontario",
  "Magnetawan, Ontario",
  "Mapleton, Ontario",
  "Marathon, Ontario",
  "Markham, Ontario",
  "Marmora and Lake, Ontario",
  "Mattawa, Ontario",
  "McDougall, Ontario",
  "Meaford, Ontario",
  "Melancthon, Ontario",
  "Minto, Ontario",
  "Mississippi Mills, Ontario",
  "Mono, Ontario",
  "Moonbeam, Ontario",
  "Morris-Turnberry, Ontario",
  "Mulmur, Ontario",
  "Muskoka Lakes, Ontario",
  "Neebing, Ontario",
  "Newmarket, Ontario",
  "Niagara Falls, Ontario",
  "Niagara-on-the-Lake, Ontario",
  "Norfolk County, Ontario",
  "North Bay, Ontario",
  "North Dumfries, Ontario",
  "North Frontenac, Ontario",
  "North Glengarry, Ontario",
  "North Huron, Ontario",
  "North Kawartha, Ontario",
  "North Middlesex, Ontario",
  "North Perth, Ontario",
  "North Stormont, Ontario",
  "Norwich, Ontario",
  "Oakville, Ontario",
  "Orangeville, Ontario",
  "Orillia, Ontario",
  "Oshawa, Ontario",
  "Ottawa, Ontario",
  "Owen Sound, Ontario",
  "Pelham, Ontario",
  "Pembroke, Ontario",
  "Penetanguishene, Ontario",
  "Perth, Ontario",
  "Perth East, Ontario",
  "Perth South, Ontario",
  "Petawawa, Ontario",
  "Peterborough, Ontario",
  "Pickering, Ontario",
  "Plympton-Wyoming, Ontario",
  "Port Colborne, Ontario",
  "Port Hope, Ontario",
  "Powassan, Ontario",
  "Prescott, Ontario",
  "Prince Edward County, Ontario",
  "Rainy River, Ontario",
  "Ramara, Ontario",
  "Red Lake, Ontario",
  "Renfrew, Ontario",
  "Rideau Lakes, Ontario",
  "Richmond Hill, Ontario",
  "Rockland, Ontario",
  "Sarnia, Ontario",
  "Saugeen Shores, Ontario",
  "Scugog, Ontario",
  "Seguin, Ontario",
  "Selwyn, Ontario",
  "Sioux Lookout, Ontario",
  "Smiths Falls, Ontario",
  "South Algonquin, Ontario",
  "South Bruce, Ontario",
  "South Bruce Peninsula, Ontario",
  "South Dundas, Ontario",
  "South Frontenac, Ontario",
  "South Glengarry, Ontario",
  "South Huron, Ontario",
  "South Stormont, Ontario",
  "Southgate, Ontario",
  "Spanish, Ontario",
  "Springwater, Ontario",
  "St. Catharines, Ontario",
  "St. Marys, Ontario",
  "St. Thomas, Ontario",
  "Stirling-Rawdon, Ontario",
  "Stone Mills, Ontario",
  "Stratford, Ontario",
  "Strathroy-Caradoc, Ontario",
  "Sudbury, Ontario",
  "Sundridge, Ontario",
  "Tay, Ontario",
  "Tay Valley, Ontario",
  "Tecumseh, Ontario",
  "Temagami, Ontario",
  "Temiskaming Shores, Ontario",
  "Thames Centre, Ontario",
  "Thessalon, Ontario",
  "Thorold, Ontario",
  "Thunder Bay, Ontario",
  "Tillsonburg, Ontario",
  "Timmins, Ontario",
  "Toronto, Ontario",
  "Trent Hills, Ontario",
  "Trent Lakes, Ontario",
  "Tweed, Ontario",
  "Tyendinaga, Ontario",
  "Uxbridge, Ontario",
  "Vaughan, Ontario",
  "Wainfleet, Ontario",
  "Wasaga Beach, Ontario",
  "Waterloo, Ontario",
  "Wawa, Ontario",
  "West Elgin, Ontario",
  "West Grey, Ontario",
  "West Lincoln, Ontario",
  "West Nipissing, Ontario",
  "West Perth, Ontario",
  "Whitby, Ontario",
  "Whitchurch-Stouffville, Ontario",
  "Wilmot, Ontario",
  "Windsor, Ontario",
  "Woodstock, Ontario",
  "Woolwich, Ontario",
  "Zorra, Ontario",
  "Adjala-Tosorontio, Ontario",
  "Centre Wellington, Ontario",
  "Erin, Ontario",
  "Georgian Bluffs, Ontario",
  "Huron-Kinloss, Ontario",
  "Huron Shores, Ontario",
  "Killarney, Ontario",
  "Loyalist Township, Ontario",
  "Madawaska Valley, Ontario",
  "Minden Hills, Ontario",
  "Nipigon, Ontario",
  "North Algona Wilberforce, Ontario",
  "North Bruce Peninsula, Ontario",
  "North Dundas, Ontario",
  "North Grenville, Ontario",
  "Otonabee-South Monaghan, Ontario",
  "Parry Sound, Ontario",
  "Puslinch, Ontario",
  "Quinte West, Ontario",
  "Red Rock, Ontario",
  "Russell, Ontario",
  "South-West Oxford, Ontario",
  "St. Clair Township, Ontario",
  "Strong, Ontario",
  "The Archipelago, Ontario",
  "The Blue Mountains, Ontario",
  "Township of Georgian Bay, Ontario",
  "Township of Muskoka Lakes, Ontario",
  "Township of Oro-Medonte, Ontario",
  "Township of Ramara, Ontario",
  "Township of Severn, Ontario",
  "Township of Tiny, Ontario",
  "Whitewater Region, Ontario",
];

// Process one city with Apify Zillow scraper
async function scrapeCity(city, apifyToken) {
  const actorId = "maxcopell~zillow-scraper";
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=90`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchTerm: city,
        maxItems: 15, // Keeping small to stay within DB limits
        type: "sale",
      }),
    }
  );
  if (!runRes.ok) throw new Error(`Apify error: ${runRes.status}`);
  return await runRes.json();
}

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || "RealtyPropFlow-cron-2026";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support pagination: ?batch=0 for first 10, ?batch=1 for next 10, etc.
  const url = new URL(req.url);
  const batch = parseInt(url.searchParams.get("batch") || "0");
  const batchSize = 8; // Scrape 8 cities per call to avoid timeout

  const start = batch * batchSize;
  const end = start + batchSize;
  const citiesToProcess = ONTARIO_CITIES.slice(start, end);

  if (citiesToProcess.length === 0) {
    return NextResponse.json({
      message: "All cities processed!",
      total: ONTARIO_CITIES.length,
    });
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  const results = [];
  const today = new Date().toISOString().split("T")[0];

  for (const city of citiesToProcess) {
    const cityKey = city.toLowerCase();

    // Skip if already scraped today
    const { data: existing } = await supabase
      .from("city_property_data")
      .select("last_scraped_at")
      .eq("city", cityKey)
      .single();

    if (existing?.last_scraped_at) {
      const lastDate = new Date(existing.last_scraped_at)
        .toISOString()
        .split("T")[0];
      if (lastDate === today) {
        results.push({ city, status: "skipped", reason: "Already scraped today" });
        continue;
      }
    }

    try {
      const properties = await scrapeCity(city, apifyToken);

      await supabase.from("city_property_data").upsert(
        {
          city: cityKey,
          properties: properties || [],
          last_scraped_at: new Date().toISOString(),
        },
        { onConflict: "city" }
      );

      results.push({ city, status: "done", count: properties?.length || 0 });
    } catch (err) {
      results.push({ city, status: "error", reason: err.message });
    }
  }

  return NextResponse.json({
    batch,
    processed: citiesToProcess.length,
    total_cities: ONTARIO_CITIES.length,
    batches_remaining: Math.ceil((ONTARIO_CITIES.length - end) / batchSize),
    next_batch: end < ONTARIO_CITIES.length ? batch + 1 : null,
    results,
  });
}
