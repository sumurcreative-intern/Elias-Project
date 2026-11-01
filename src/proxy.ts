import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { nextOnboardingStep, onboardingColumns, type OnboardingProgress } from '@/lib/onboarding';
import { REMEMBER_COOKIE, sessionCookieOptions } from '@/lib/supabase/remember';

// Only for signed-out visitors; signed-in users are sent on into the app
const guestPaths = ['/login', '/signup'];
// Open to everyone: the recovery flow signs the user in midway, and the
// confirmation link lands on /auth/callback before any session exists
const openPrefixes = ['/forgot-password', '/auth/'];

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
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (openPrefixes.some((prefix) => path.startsWith(prefix))) return response;

  // A confirmation link that fell back to the Site URL (e.g. its redirect URL
  // isn't allowed in Supabase) still gets confirmed instead of bouncing to login
  const params = request.nextUrl.searchParams;
  if (params.has('token_hash')) return redirect(request, response, `/auth/confirm?${params}`);
  if (params.has('code')) return redirect(request, response, `/auth/callback?${params}`);

  const isGuestPage = guestPaths.includes(path);
  if (!user) return isGuestPage ? response : redirect(request, response, '/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(onboardingColumns)
    .eq('id', user.id)
    .maybeSingle<OnboardingProgress>();
  const step = nextOnboardingStep(profile);

  if (step) {
    // The profile step stays reachable from goals through its back link
    const allowed = path === step || (step === '/onboarding/goals' && path === '/onboarding/profile');
    return allowed ? response : redirect(request, response, step);
  }

  if (isGuestPage || path.startsWith('/onboarding') || path === '/') {
    return redirect(request, response, '/dashboard');
  }
  return response;
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
