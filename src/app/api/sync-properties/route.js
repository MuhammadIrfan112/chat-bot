import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const city = body.city || "Milton";
        const maxItems = body.maxItems || 50;
        const operation = body.operation || "buy";

        console.log(`Starting Apify scrape for: ${city}, max: ${maxItems}`);

        // Actor: igolaizola/realtor-canada-scraper-ppe ($0.80 per 1000 results)
        const run = await apifyClient.actor('igolaizola/realtor-canada-scraper-ppe').call({
            location:  city,
            maxItems:  maxItems,
            operation: operation,
            sortBy:    "newest",
        });

        console.log(`Apify Run Finished. Dataset: ${run.defaultDatasetId}`);

        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true, message: 'No properties found.', count: 0 }, { status: 200 });
        }

        console.log(`Found ${items.length} properties. Saving to Supabase...`);

        let savedCount = 0;
        for (const item of items) {
            // igolaizola actor returns NESTED data structure
            const prop     = item.Property || {};
            const building = item.Building || {};
            const propAddr = prop.Address   || {};

            const mls       = item.MlsNumber || item.mlsNumber || item.id || `UNKNOWN-${Date.now()}`;
            const price     = prop.Price || "Contact for price";
            const address   = [propAddr.StreetAddress, propAddr.AddressText].find(Boolean) ||
                              propAddr.AddressText || "Address not provided";
            const bedrooms  = building.Bedrooms  || building.BedroomsTotal  || "?";
            const bathrooms = building.BathroomTotal || building.Bathrooms  || "?";
            const propType  = prop.Type || building.Type || "Residential";
            const desc      = item.PublicRemarks || "";

            // Photos: prop.Photo is an array of objects with HighResPath or MedResPath
            let imageUrl = "";
            if (Array.isArray(prop.Photo) && prop.Photo.length > 0) {
                imageUrl = prop.Photo[0].HighResPath || prop.Photo[0].MedResPath || prop.Photo[0].LowResPath || "";
            } else if (item.photoUrl) {
                imageUrl = item.photoUrl;
            }

            // Full Realtor.ca URL
            const url = item.URL || 
                        (item.RelativeURLEn ? `https://www.realtor.ca${item.RelativeURLEn}` : "");

            const { error } = await supabase
                .from('properties')
                .upsert({
                    mls_number:    String(mls),
                    price:         String(price),
                    address:       String(address),
                    city:          city.split(',')[0].trim(),
                    province:      "ON",
                    bedrooms:      bedrooms,
                    bathrooms:     bathrooms,
                    property_type: String(propType),
                    description:   String(desc).slice(0, 1000),
                    image_url:     String(imageUrl),
                    url:           String(url)
                }, { onConflict: 'mls_number' });

            if (!error) savedCount++;
            else console.error("Supabase insert error:", error.message);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully scraped and saved ${savedCount} properties for ${city}.`,
            count: savedCount,
            sample: items[0]   // Return first item so we can verify field names
        }, { status: 200 });

    } catch (error) {
        console.error("Scraping error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
