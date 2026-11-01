import type { ComponentProps, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import AuthAnimations from './AuthAnimations';
import Footer from './Footer';
import Header from './Header';
import HeroPanel from './HeroPanel';

type AuthLayoutProps = {
  hero: ComponentProps<typeof HeroPanel>;
  /** Laptop gap under the header: 70px for auth/onboarding, 40px for recovery */
  spacing?: 'default' | 'tight';
  /** The form column; it owns its own mobile/tablet spacing. */
  children: ReactNode;
};

/** Shared shell for the auth, onboarding and recovery pages: header, hero + form, footer. */
export default async function AuthLayout({ hero, spacing = 'default', children }: AuthLayoutProps) {
  // Signed-in users (onboarding, mid-recovery) get Keluar instead of the login/signup links
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthAnimations className="flex min-h-screen flex-col bg-bg-white">
      <Header signedIn={user !== null} />
      <main
        className={`flex w-full justify-center md:px-[98px] laptop:mx-auto laptop:max-w-[1440px] laptop:items-stretch laptop:px-20 laptop:pb-5 ${
          spacing === 'tight' ? 'laptop:pt-10' : 'laptop:pt-[70px]'
        }`}
      >
        <HeroPanel {...hero} />
        {children}
      </main>
      <Footer />
    </AuthAnimations>
  );
}
