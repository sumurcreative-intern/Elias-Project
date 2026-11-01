import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { REMEMBER_COOKIE, sessionCookieOptions } from './remember';

/** Supabase client for route handlers and server components. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          const remember = cookieStore.get(REMEMBER_COOKIE)?.value;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, sessionCookieOptions(options, remember)),
            );
          } catch {
            // Server components can't set cookies; route handlers can
          }
        },
      },
    },
  );
}
