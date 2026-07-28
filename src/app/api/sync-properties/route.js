import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Service Role for admin access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Apify Client
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const city = body.city || "Milton, ON";

        console.log(`Starting Apify scrape for: ${city}`);

        // Using one of the most reliable Realtor.ca scraper actors
        const actorId = 'memo23/realtor-ca-scraper';
        
        // Starts an actor and waits for it to finish
        const run = await apifyClient.actor(actorId).call({
            "location": city,
            "maxItems": 20 // Keep it small for testing to save credits
        });

        console.log(`Apify Run Finished. Fetching dataset: ${run.defaultDatasetId}`);

        // Fetch the results from the dataset
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            return NextResponse.json({ success: true, message: 'No properties found.', count: 0 }, { status: 200 });
        }

        console.log(`Found ${items.length} properties. Saving to Supabase...`);

        // Format and save to Supabase
        let savedCount = 0;
        for (const item of items) {
            // Safely extract data depending on the actor's output format
            const mls = item.mlsNumber || item.mls || item.id || `UNKNOWN-${Math.random()}`;
            const price = item.price || "Contact for price";
            const address = item.address || item.title || "Address not provided";
            const bedrooms = item.bedrooms || item.beds || "?";
            const bathrooms = item.bathrooms || item.baths || "?";
            const propertyType = item.propertyType || item.type || "Residential";
            const description = item.description || "";
            const imageUrl = item.image || (item.images && item.images.length > 0 ? item.images[0] : "") || "";
            const url = item.url || item.link || "";

            const { error } = await supabase
                .from('properties')
                .upsert(
                    { 
                        mls_number: String(mls), 
                        price: String(price), 
                        address: String(address), 
                        city: city.split(',')[0].trim(), 
                        province: "ON", 
                        bedrooms: String(bedrooms), 
                        bathrooms: String(bathrooms), 
                        property_type: String(propertyType), 
                        description: String(description), 
                        image_url: String(imageUrl), 
                        url: String(url)
                    },
                    { onConflict: 'mls_number' }
                );
            
            if (!error) savedCount++;
            if (error) console.error("Supabase insert error:", error);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully scraped and saved ${savedCount} properties for ${city}.`,
            count: savedCount
        }, { status: 200 });

    } catch (error) {
        console.error("Scraping error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
