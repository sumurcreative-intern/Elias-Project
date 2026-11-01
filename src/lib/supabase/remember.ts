import type { CookieOptions } from '@supabase/ssr';

/**
 * Set to "0" when the user signs in without "Ingat saya". It's a session
 * cookie itself, so it disappears together with the auth cookies.
 */
export const REMEMBER_COOKIE = 'elias-remember';

/** Records the "Ingat saya" choice before signing in, so every later session write follows it. */
export function setRememberPreference(remember: boolean) {
  document.cookie = remember
    ? `${REMEMBER_COOKIE}=; path=/; max-age=0; samesite=lax`
    : `${REMEMBER_COOKIE}=0; path=/; samesite=lax`;
}

/**
 * Supabase always gives its auth cookies a 400-day lifetime. Without "Ingat saya"
 * drop it, turning them into session cookies the browser clears when it closes.
 * Removals (maxAge 0) pass through untouched.
 */
export function sessionCookieOptions(options: CookieOptions, rememberValue: string | undefined): CookieOptions {
  if (rememberValue !== '0' || options.maxAge === 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}
