import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/safeNextPath';

/**
 * Landing point for links that carry a ?code= (Supabase's default email links).
 * The code only works in the browser that started the signup; /auth/confirm doesn't have that limit.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNextPath(searchParams.get('next'), '/onboarding/profile')}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
