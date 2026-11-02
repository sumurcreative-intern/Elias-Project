import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import AppShell from '@/components/app/AppShell';
import DevEmailTestTrigger from '@/components/DevEmailTestTrigger';
import { allowedTestRecipients, devToolsEnabled } from '@/lib/devTools';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Tes Briefing — Elias',
  robots: { index: false },
};

// Temporary home for the on-demand trigger until a Settings page exists
export default async function DevBriefingPage() {
  // Decide per request: at build time the dev check would bake in a 404
  await connection();
  if (!devToolsEnabled()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The proxy already sends guests to signup; this keeps the page safe on its own
  if (!user) notFound();

  return (
    <AppShell userId={user.id}>
      <div data-animate="page-item" className="mx-auto flex max-w-xl flex-col gap-6 pb-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-display-sm font-semibold">Tes Daily Briefing</h1>
          <p className="text-md text-ink-50">
            Menjalankan GDELT, YouTube, OpenRouter, lalu Resend sekarang juga. Satu tes memakai satu jatah analisis harian kamu.
          </p>
        </div>
        <DevEmailTestTrigger defaultEmail={allowedTestRecipients(user.email)[0] ?? ''} />
      </div>
    </AppShell>
  );
}
