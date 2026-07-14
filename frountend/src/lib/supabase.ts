import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when Supabase credentials are configured. Auth UI degrades gracefully when false. */
export const supabaseConfigured = Boolean(url && key);

// A single shared client. If creds are missing we still export a client-shaped stub-free value,
// but guard usage with `supabaseConfigured` to avoid runtime crashes.
export const supabase = supabaseConfigured
  ? createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createClient("http://localhost", "public-anon-key-missing");
