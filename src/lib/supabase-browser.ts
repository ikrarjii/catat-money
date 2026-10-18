import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let clientRememberSetting = true;

/** Explicit login preference can replace a client initialized by another page. */
export function getSupabaseBrowser(rememberMe?: boolean) {
  if (client && (rememberMe === undefined || rememberMe === clientRememberSetting)) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY harus diatur.");

  client = createBrowserClient(url, anonKey, {
    isSingleton: false,
    cookieOptions: (rememberMe ?? true) ? { maxAge: 60 * 60 * 24 * 30 } : {},
  });
  clientRememberSetting = rememberMe ?? true;
  return client;
}
