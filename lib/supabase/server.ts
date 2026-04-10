// SERVER ONLY. Uses service role key. Never import from a client component.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("getServerSupabase: missing env var NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("getServerSupabase: missing env var SUPABASE_SERVICE_ROLE_KEY");

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
