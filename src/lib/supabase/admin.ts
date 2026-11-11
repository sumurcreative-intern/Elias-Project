import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Only a real client is cached: a missing key is checked again on the next
// call, so adding it to .env.local works without restarting the server
let admin: SupabaseClient | undefined;
const TIMEOUT_MS = 15_000;

/**
 * Server-only client with the secret key, which bypasses RLS. Only for writes
 * no user may make, like saving the daily cycle. Null until SUPABASE_SECRET_KEY
 * is set (Supabase dashboard → Project Settings → API Keys → Secret keys).
 */
export function createAdminClient(): SupabaseClient | null {
  if (admin) return admin;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // supabase-js sets no timeout. Two reads of the daily cycle never answered
    // on 11 Nov 2026 and held it until its deadline; now they fail instead
    global: {
      fetch: (input, init) => {
        const timeout = AbortSignal.timeout(TIMEOUT_MS);
        return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
      },
    },
  });
  return admin;
}
