import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Apify Client
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Build a Realtor.ca search URL for a given city
function buildRealtorUrl(city) {
    const cityMap = {
        'Milton':      { lat: '43.5183', lng: '-79.8833', zoom: 12, geoName: 'Milton, ON' },
        'Toronto':     { lat: '43.7080', lng: '-79.3764', zoom: 11, geoName: 'Toronto, ON' },
        'Brampton':    { lat: '43.7315', lng: '-79.7624', zoom: 11, geoName: 'Brampton, ON' },
        'Mississauga': { lat: '43.5890', lng: '-79.6441', zoom: 11, geoName: 'Mississauga, ON' },
        'Oakville':    { lat: '43.4675', lng: '-79.6877', zoom: 12, geoName: 'Oakville, ON' },
        'Hamilton':    { lat: '43.2557', lng: '-79.8711', zoom: 11, geoName: 'Hamilton, ON' },
        'Burlington':  { lat: '43.3255', lng: '-79.7990', zoom: 12, geoName: 'Burlington, ON' },
    };

    const cityKey = Object.keys(cityMap).find(k => city.toLowerCase().includes(k.toLowerCase())) || 'Milton';
    const c = cityMap[cityKey];

    return `https://www.realtor.ca/map#ZoomLevel=${c.zoom}&Center=${c.lat}%2C${c.lng}&GeoName=${encodeURIComponent(c.geoName)}&Sort=6-D&PropertySearchTypeId=0&TransactionTypeId=2&Currency=CAD`;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const city = body.city || "Milton, ON";

        console.log(`Starting Apify scrape for: ${city}`);

        const searchUrl = buildRealtorUrl(city);
        console.log(`Realtor.ca URL: ${searchUrl}`);

        // Correct actor from Apify Store — requires startUrls input
        const run = await apifyClient.actor('scrapemind/realtor-ca-scraper').call({
            startUrls: [{ url: searchUrl }],
            maxListings: 20,
            numberOfWorkers: 3,
            getDetails: false,
            simplifyOutput: true,
        });

        console.log(`Apify Run Finished. Dataset: ${run.defaultDatasetId}`);

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true, message: 'No properties found.', count: 0 }, { status: 200 });
        }

        console.log(`Found ${items.length} properties. Saving to Supabase...`);

        let savedCount = 0;
        for (const item of items) {
            const mls        = item.mlsNumber || item.MlsNumber || item.id || `UNKNOWN-${Math.random()}`;
            const price      = item.price || item.Price || "Contact for price";
            const address    = item.address || item.Address || item.streetAddress || "Address not provided";
            const bedrooms   = item.bedrooms || item.Bedrooms || item.bedroomsTotal || "?";
            const bathrooms  = item.bathrooms || item.Bathrooms || item.bathroomsTotal || "?";
            const propType   = item.propertyType || item.PropertyType || "Residential";
            const desc       = item.description || "";
            const imageUrl   = item.photoUrl || item.photo || item.image || (Array.isArray(item.photos) && item.photos[0]) || "";
            const url        = item.url || item.listingUrl || "";

            const { error } = await supabase
                .from('properties')
                .upsert({
                    mls_number:    String(mls),
                    price:         String(price),
                    address:       String(address),
                    city:          city.split(',')[0].trim(),
                    province:      "ON",
                    bedrooms:      String(bedrooms),
                    bathrooms:     String(bathrooms),
                    property_type: String(propType),
                    description:   String(desc).slice(0, 1000),
                    image_url:     String(imageUrl),
                    url:           String(url)
                }, { onConflict: 'mls_number' });

            if (!error) savedCount++;
            if (error) console.error("Supabase insert error:", error.message);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully scraped and saved ${savedCount} properties for ${city}.`,
            count: savedCount,
            sample: items[0]
        }, { status: 200 });

    } catch (error) {
        console.error("Scraping error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
