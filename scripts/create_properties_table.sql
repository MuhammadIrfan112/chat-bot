-- Run this SQL in Supabase SQL Editor to create the properties table
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste & Run

CREATE TABLE IF NOT EXISTS morton_grove_properties (
  id BIGSERIAL PRIMARY KEY,
  zpid TEXT UNIQUE,
  listing_status TEXT,         -- 'forRent' or 'forSale'
  home_type TEXT,              -- 'APARTMENT', 'SINGLE_FAMILY', 'TOWNHOUSE', etc.
  address_full TEXT,
  address_street TEXT,
  address_city TEXT DEFAULT 'Morton Grove',
  address_state TEXT DEFAULT 'IL',
  address_zip TEXT,
  price_amount NUMERIC,        -- numeric price for filtering
  price_formatted TEXT,        -- e.g. "$3,500/mo" or "$499,900"
  bedrooms INT,
  bathrooms NUMERIC,
  living_area INT,             -- sqft
  main_image TEXT,             -- main photo URL
  property_url TEXT,           -- Zillow link
  days_on_zillow INT,
  zestimate NUMERIC,
  rent_zestimate NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  has_parking BOOLEAN,
  pets_allowed BOOLEAN,
  availability_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_listing_status ON morton_grove_properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_bedrooms ON morton_grove_properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_price_amount ON morton_grove_properties(price_amount);

-- Allow public read access (chatbot reads from this)
ALTER TABLE morton_grove_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON morton_grove_properties FOR SELECT USING (true);
CREATE POLICY "Allow service role insert" ON morton_grove_properties FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role upsert" ON morton_grove_properties FOR UPDATE USING (true);
