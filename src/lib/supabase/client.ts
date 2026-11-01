import { createBrowserClient } from '@supabase/ssr';
import { REMEMBER_COOKIE, sessionCookieOptions } from './remember';

function readCookies() {
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf('=');
      const raw = pair.slice(index + 1);
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        // Not URI-encoded by us; keep it as-is
      }
      return { name: pair.slice(0, index), value };
    });
}

/** Supabase client for client components. The session lives in cookies, so the server can read it too. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: readCookies,
        setAll(cookiesToSet) {
          const remember = readCookies().find(({ name }) => name === REMEMBER_COOKIE)?.value;
          cookiesToSet.forEach(({ name, value, options }) => {
            const { path, domain, maxAge, expires, sameSite, secure } = sessionCookieOptions(options, remember);
            let cookie = `${name}=${encodeURIComponent(value)}`;
            if (path) cookie += `; path=${path}`;
            if (domain) cookie += `; domain=${domain}`;
            if (maxAge !== undefined) cookie += `; max-age=${maxAge}`;
            if (expires) cookie += `; expires=${expires.toUTCString()}`;
            if (sameSite) cookie += `; samesite=${sameSite === true ? 'strict' : sameSite}`;
            if (secure) cookie += '; secure';
            document.cookie = cookie;
          });
        },
      },
    },
  );
}
