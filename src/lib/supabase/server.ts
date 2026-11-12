import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { REMEMBER_COOKIE, REMEMBER_METADATA, sessionCookieOptions } from './remember';

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

/**
 * A confirmation link opened in another browser never saw the sign-up's
 * "Ingat saya" cookie, so the session it just wrote got Supabase's 400-day
 * lifetime. When the user left it unchecked, records that here and rewrites
 * the auth cookies without a lifetime, so they end with the browser session.
 */
export async function applySignupRememberChoice(user: User | null) {
  if (user?.user_metadata?.[REMEMBER_METADATA] !== false) return;
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, '0', { path: '/', sameSite: 'lax' });
  for (const { name, value } of cookieStore.getAll()) {
    if (name.startsWith('sb-')) cookieStore.set(name, value, { path: '/', sameSite: 'lax' });
  }
}
