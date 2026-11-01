import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/safeNextPath';

/**
 * Landing point for the signup confirmation email, set in the "Confirm signup"
 * template as {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email.
 * Unlike /auth/callback it works in any browser, not only the one used to sign up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNextPath(searchParams.get('next'), '/onboarding/profile')}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
