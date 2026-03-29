import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase ENV", {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  });
}

export const supabase = createClient(
  SUPABASE_URL || "https://owgouuqnbgafmsnzcnbm.supabase.co",
  SUPABASE_ANON_KEY || "public-anon-key",
  {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);