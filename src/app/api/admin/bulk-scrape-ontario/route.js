import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Full Ontario municipalities list
const ONTARIO_CITIES = [
  "Addington Highlands", "Adelaide Metcalfe", "Admaston Bromley", "Ajax",
  "Algonquin Highlands", "Alfred and Plantagenet", "Alnwick Haldimand", "Amaranth",
  "Amherstburg", "Armour", "Armstrong", "Arnprior", "Arran-Elderslie",
  "Ashfield-Colborne-Wawanosh", "Asphodel-Norwood", "Athens", "Atikokan",
  "Augusta", "Aurora", "Aylmer", "Bancroft", "Barrie", "Bayham", "Beckwith",
  "Belleville", "Billings", "Blind River", "Blue Mountains", "Bonfield",
  "Bonnechere Valley", "Bracebridge", "Bradford West Gwillimbury", "Brampton",
  "Brant", "Brantford", "Brock", "Brockton", "Brockville", "Bruce Mines",
  "Burlington", "Caledon", "Callander", "Calvin", "Cambridge", "Carleton Place",
  "Casselman", "Central Elgin", "Central Frontenac", "Central Huron",
  "Central Manitoulin", "Central Middlesex", "Centre Hastings", "Champlain",
  "Chapleau", "Chatham-Kent", "Chatsworth", "Clarington", "Clearview",
  "Cochrane", "Collingwood", "Cornwall", "Cobourg", "Cramahe",
  "Clarence-Rockland", "Deep River", "Deseronto", "Dutton Dunwich", "Dryden",
  "Durham", "East Ferris", "East Garafraxa", "East Gwillimbury",
  "East Hawkesbury", "East Luther Grand Valley", "East Zorra-Tavistock",
  "Elizabethtown-Kitley", "Elliot Lake", "Espanola", "Essa", "Essex",
  "Fort Erie", "Fort Frances", "French River", "Gananoque", "Georgian Bay",
  "Georgina", "Goderich", "Gore Bay", "Grand Valley", "Gravenhurst",
  "Greater Napanee", "Greater Sudbury", "Grey Highlands", "Guelph",
  "Haldimand County", "Haliburton", "Hamilton", "Hanover",
  "Hastings Highlands", "Hawkesbury", "Hearst", "Horton", "Huntsville",
  "Huron East", "Ignace", "Ingersoll", "Innisfil", "Iroquois Falls",
  "Kapuskasing", "Kawartha Lakes", "Kearney", "Kenora",
  "Killaloe Hagarty and Richards", "Kincardine", "King", "Kingston",
  "Kingsville", "Kirkland Lake", "Kitchener", "Laurentian Hills",
  "Laurentian Valley", "Lake of Bays", "Lakeshore", "LaSalle",
  "Leeds and the Thousand Islands", "Loyalist", "London", "Lucan Biddulph",
  "Magnetawan", "Mapleton", "Marathon", "Markham", "Marmora and Lake",
  "Mattawa", "McDougall", "Meaford", "Melancthon", "Minto",
  "Mississippi Mills", "Mono", "Moonbeam", "Morris-Turnberry", "Mulmur",
  "Muskoka Lakes", "Neebing", "Newmarket", "Niagara Falls",
  "Niagara-on-the-Lake", "Norfolk County", "North Bay", "North Dumfries",
  "North Frontenac", "North Glengarry", "North Huron", "North Kawartha",
  "North Middlesex", "North Perth", "North Stormont", "Norwich", "Oakville",
  "Orangeville", "Orillia", "Oshawa", "Ottawa", "Owen Sound", "Pelham",
  "Pembroke", "Penetanguishene", "Perth", "Perth East", "Perth South",
  "Petawawa", "Peterborough", "Pickering", "Plympton-Wyoming", "Port Colborne",
  "Port Hope", "Powassan", "Prescott", "Prince Edward County", "Rainy River",
  "Ramara", "Red Lake", "Renfrew", "Rideau Lakes", "Richmond Hill",
  "Rockland", "Sarnia", "Saugeen Shores", "Scugog", "Seguin", "Selwyn",
  "Sioux Lookout", "Smiths Falls", "South Algonquin", "South Bruce",
  "South Bruce Peninsula", "South Dundas", "South Frontenac",
  "South Glengarry", "South Huron", "South Stormont", "Southgate",
  "Spanish", "Springwater", "St. Catharines", "St. Marys", "St. Thomas",
  "Stirling-Rawdon", "Stone Mills", "Stratford", "Strathroy-Caradoc",
  "Sudbury", "Sundridge", "Tay", "Tay Valley", "Tecumseh", "Temagami",
  "Temiskaming Shores", "Thames Centre", "Thessalon", "Thorold",
  "Thunder Bay", "Tillsonburg", "Timmins", "Toronto", "Trent Hills",
  "Trent Lakes", "Tweed", "Tyendinaga", "Uxbridge", "Vaughan",
  "Wainfleet", "Wasaga Beach", "Waterloo", "Wawa", "West Elgin",
  "West Grey", "West Lincoln", "West Nipissing", "West Perth", "Whitby",
  "Whitchurch-Stouffville", "Wilmot", "Windsor", "Woodstock", "Woolwich",
  "Zorra", "Adjala-Tosorontio", "Centre Wellington", "Erin",
  "Georgian Bluffs", "Huron-Kinloss", "Huron Shores", "Killarney",
  "Loyalist Township", "Madawaska Valley", "Minden Hills", "Nipigon",
  "North Algona Wilberforce", "North Bruce Peninsula", "North Dundas",
  "North Grenville", "Otonabee-South Monaghan", "Parry Sound", "Puslinch",
  "Quinte West", "Red Rock", "Russell", "South-West Oxford",
  "St. Clair Township", "Strong", "The Archipelago", "The Blue Mountains",
  "Township of Georgian Bay", "Township of Muskoka Lakes",
  "Township of Oro-Medonte", "Township of Ramara", "Township of Severn",
  "Township of Tiny", "Whitewater Region",
];

// Scrape Realtor.ca (Canada's official MLS) — completely FREE, no API key needed
async function scrapeRealtorCa(city) {
  try {
    const searchText = encodeURIComponent(`${city}, Ontario`);

    // Realtor.ca uses this internal API endpoint
    const body = new URLSearchParams({
      CultureId: "1",
      ApplicationId: "1",
      RecordsPerPage: "20",
      CurrentPage: "1",
      PropertySearchTypeId: "1",
      TransactionTypeId: "2", // For Sale
      SortOrder: "6",
      SortBy: "1",
      SearchText: `${city}, Ontario`,
      Version: "7.0",
    });

    const res = await fetch(
      "https://api2.realtor.ca/Listing.svc/PropertySearch_Post",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://www.realtor.ca",
          Referer: "https://www.realtor.ca/",
        },
        body: body.toString(),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.Results?.length) return [];

    // Map to our standard format
    return data.Results.slice(0, 15).map((item) => {
      const addr = item.Property?.Address?.AddressText || "";
      const price = item.Property?.Price || "Price on Request";
      const beds = item.Building?.BedroomTotal || "N/A";
      const baths = item.Building?.BathroomTotal || "N/A";
      const img =
        item.Property?.Photo?.[0]?.HighResPath ||
        item.Property?.Photo?.[0]?.MedResPath ||
        "";
      const mlsNum = item.MlsNumber || "";
      const url = mlsNum
        ? `https://www.realtor.ca/real-estate/${mlsNum}`
        : "https://www.realtor.ca";
      const propType = item.Property?.Type || "Residential";
      const sqft = item.Building?.SizeInterior || "";

      return {
        address: addr.split("|")[0]?.trim() || addr,
        city: city,
        state: "ON",
        price: String(price).replace(/[^0-9]/g, "") || null,
        priceDisplay: price,
        bedrooms: beds,
        bathrooms: baths,
        livingArea: sqft,
        imgSrc: img,
        url: url,
        propertyType: propType,
        mlsNumber: mlsNum,
      };
    });
  } catch (err) {
    console.error(`Realtor.ca error for ${city}:`, err.message);
    return [];
  }
}

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || "RealtyPropFlow-cron-2026";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const batch = parseInt(url.searchParams.get("batch") || "0");
  const batchSize = 5; // 5 cities per call — give each city enough time

  const start = batch * batchSize;
  const end = start + batchSize;
  const citiesToProcess = ONTARIO_CITIES.slice(start, end);

  if (citiesToProcess.length === 0) {
    return NextResponse.json({
      message: "All cities processed!",
      total: ONTARIO_CITIES.length,
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const results = [];

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
      const properties = await scrapeRealtorCa(city);

      await supabase.from("city_property_data").upsert(
        {
          city: cityKey,
          properties: properties,
          last_scraped_at: new Date().toISOString(),
        },
        { onConflict: "city" }
      );

      results.push({ city, status: "done", count: properties.length });
    } catch (err) {
      results.push({ city, status: "error", reason: err.message });
    }

    // Small delay to be polite to realtor.ca
    await new Promise((r) => setTimeout(r, 800));
  }

  return NextResponse.json({
    batch,
    source: "realtor.ca",
    processed: citiesToProcess.length,
    total_cities: ONTARIO_CITIES.length,
    total_batches: Math.ceil(ONTARIO_CITIES.length / batchSize),
    next_batch: end < ONTARIO_CITIES.length ? batch + 1 : null,
    results,
  });
}
