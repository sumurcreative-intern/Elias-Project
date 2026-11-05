import { createServerClient } from '@supabase/ssr';
import { isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { nextOnboardingStep, onboardingColumns, onboardingSteps, type OnboardingProgress } from '@/lib/onboarding';
import { REMEMBER_COOKIE, sessionCookieOptions } from '@/lib/supabase/remember';

// Only for signed-out visitors; signed-in users are sent on into the app
const guestPaths = ['/login', '/signup'];
// Open to everyone: the recovery flow signs the user in midway (only for its
// last step, see below), and the confirmation link lands on /auth/callback
// before any session exists. API
// routes check the session themselves and answer with JSON, not a redirect
const openPrefixes = ['/forgot-password', '/auth/', '/api/'];
// App pages guests can use: a device-scoped Arsip (AR-8). Signed-in users
// still have to finish onboarding first
const publicPaths = ['/arsip'];

/**
 * Routes every request by sign-in and onboarding state, and keeps the Supabase
 * session cookie fresh. The database (RLS) still guards the data itself.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          const remember = request.cookies.get(REMEMBER_COOKIE)?.value;
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, sessionCookieOptions(options, remember)),
          );
        },
      },
    },
  );

  // getUser() checks the session with Supabase and refreshes it if needed
  const {
    data: { user: verifiedUser },
    error,
  } = await supabase.auth.getUser();
  let user = verifiedUser;

  const path = request.nextUrl.pathname;
  // Recovery always starts signed out, and the session a recovery code creates
  // is only good for choosing the new password, which it needs. Prefetches
  // never sign anyone out: the back links would end the session on hover
  const choosingPassword = path === '/forgot-password/new-password';
  if (user && !choosingPassword && !request.headers.has('next-router-prefetch')) {
    const signOut =
      path.startsWith('/forgot-password') ||
      (!path.startsWith('/api/') && !path.startsWith('/auth/') && (await isRecoverySession(supabase)));
    if (signOut) {
      await supabase.auth.signOut({ scope: 'local' });
      user = null;
    }
  }

  if (openPrefixes.some((prefix) => path.startsWith(prefix))) return response;

  // Supabase couldn't be reached, so the session is unknown, not missing.
  // Sending the user to /login here would retry the refresh there and get the
  // session revoked; let the page check the session itself instead
  if (isAuthRetryableFetchError(error)) return response;

  // A confirmation link that fell back to the Site URL (e.g. its redirect URL
  // isn't allowed in Supabase) still gets confirmed instead of bouncing to login
  const params = request.nextUrl.searchParams;
  if (params.has('token_hash')) return redirect(request, response, `/auth/confirm?${params}`);
  if (params.has('code')) return redirect(request, response, `/auth/callback?${params}`);

  const isGuestPage = guestPaths.includes(path);
  if (!user) {
    // The site opens on sign-up for guests; Beranda is for signed-in users
    if (path === '/') return redirect(request, response, '/signup');
    return isGuestPage || publicPaths.includes(path) ? response : redirect(request, response, '/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(onboardingColumns)
    .eq('id', user.id)
    .maybeSingle<OnboardingProgress>();
  const step = nextOnboardingStep(profile);

  if (step) {
    // Earlier steps stay reachable through the back links
    const reached = onboardingSteps.indexOf(step);
    const allowed = onboardingSteps.slice(0, reached + 1).includes(path);
    return allowed ? response : redirect(request, response, step);
  }

  if (isGuestPage || path.startsWith('/onboarding') || path === '/dashboard') {
    return redirect(request, response, '/');
  }
  return response;
}

/**
 * Whether the session came from a password-recovery code (`amr` method
 * "recovery"). getUser() has already verified this access token.
 */
async function isRecoverySession(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const payload = session?.access_token.split('.')[1];
  if (!payload) return false;
  try {
    const { amr } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      amr?: ({ method: string } | string)[];
    };
    return amr?.some((entry) => (typeof entry === 'string' ? entry : entry.method) === 'recovery') ?? false;
  } catch {
    return false;
  }
}

/** Redirect while keeping any session cookies Supabase just refreshed. */
function redirect(request: NextRequest, response: NextResponse, path: string) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = {
  // Skip Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
