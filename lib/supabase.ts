import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New-style browser-safe publishable key (sb_publishable_...). We also accept
// the legacy anon-key var name as a fallback so existing setups keep working.
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both required env vars are present. */
export const isSupabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/**
 * Lazily create the Supabase client. Returns null when env vars are missing so
 * the UI can show a setup screen instead of crashing.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, publishableKey!, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
