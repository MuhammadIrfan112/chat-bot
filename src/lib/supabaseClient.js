import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Session browser mein save raho
    autoRefreshToken: true,     // Token auto-refresh hota rahe
    storageKey: 'rpf-auth',     // Unique storage key
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});
