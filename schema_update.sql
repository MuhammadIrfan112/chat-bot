-- Drop tables if they exist to prevent foreign key or column conflicts
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS agents;

-- 1. Create Agents Table
CREATE TABLE agents (
  agent_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  office_id TEXT,
  assigned_zip_codes JSONB DEFAULT '[]'::jsonb,
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  languages_spoken JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Properties Table
CREATE TABLE properties (
  property_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id TEXT NOT NULL,
  listing_agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,
  mls_number TEXT UNIQUE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  price NUMERIC,
  bedrooms NUMERIC,
  bathrooms NUMERIC,
  square_feet NUMERIC,
  lot_size NUMERIC,
  property_type TEXT,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Active',
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Deals Table
CREATE TABLE deals (
  deal_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bot_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,
  stage TEXT DEFAULT 'Lead',
  contract_price NUMERIC,
  estimated_closing_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster querying by bot_id
CREATE INDEX IF NOT EXISTS idx_agents_bot_id ON agents(bot_id);
CREATE INDEX IF NOT EXISTS idx_properties_bot_id ON properties(bot_id);
CREATE INDEX IF NOT EXISTS idx_deals_bot_id ON deals(bot_id);
