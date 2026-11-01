import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Logo from '@/components/Logo';
import SignOutButton from '@/components/SignOutButton';
import { createClient } from '@/lib/supabase/server';
import { targetMarketLabel } from '@/lib/targetMarkets';

export const metadata: Metadata = {
  title: 'Dashboard — Elias',
};

// TODO: placeholder until the real app home exists
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, target_market')
    .eq('id', user.id)
    .maybeSingle();
  const market = targetMarketLabel(profile?.target_market);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-12 px-6 py-7 md:px-[62px] md:py-12">
      <header className="flex items-center justify-between">
        <Logo priority />
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-2.5">
        <h1 className="text-display-md font-bold">Halo, {profile?.name ?? 'kamu'}!</h1>
        <p className="text-md md:text-xl">Profil kamu sudah lengkap. Elias sedang menyiapkan email pagi pertamamu.</p>
        {market && (
          <p className="text-md text-ink-50">
            Tren dan rekomendasi disesuaikan untuk target market <span className="font-semibold text-primary">{market}</span>.
          </p>
        )}
      </div>
    </main>
  );
}
