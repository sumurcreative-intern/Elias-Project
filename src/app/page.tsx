import type { Metadata } from 'next';
import { Suspense } from 'react';
import AppShell from '@/components/app/AppShell';
import CycleLoading from '@/components/beranda/CycleLoading';
import CycleUnavailable from '@/components/beranda/CycleUnavailable';
import FeedPages from '@/components/beranda/FeedPages';
import InsightCard, { type Flavour } from '@/components/beranda/InsightCard';
import ProfilePrompt from '@/components/beranda/ProfilePrompt';
import QuietDay from '@/components/beranda/QuietDay';
import { archetypeDirections } from '@/lib/archetypes';
import { creativeRoleFor, creativeRoleLabels } from '@/lib/creativeRoles';
import { daysBefore, formatDate } from '@/lib/dates';
import { brandContextFor, fetchProfile } from '@/lib/elias/brandProfile';
import { feedPage, groupByDay } from '@/lib/insights/feed';
import { getRecentFeed } from '@/lib/insights/live';
import { sources, type Insight } from '@/lib/insights/types';
import { createClient } from '@/lib/supabase/server';
import { targetMarketLabel } from '@/lib/targetMarkets';

export const metadata: Metadata = {
  title: 'Beranda — Elias',
};

/** Opens with the count, never a greeting (V2): "18 sinyal dalam 5 hari terakhir, 4 hari ini. 7 layak dieksekusi, …" */
function headline(insights: Insight[], today: number): string {
  const count = (verdict: Insight['verdict']) => insights.filter((insight) => insight.verdict === verdict).length;
  const parts = [
    [count('act'), 'layak dieksekusi'],
    [count('watch'), 'dipantau'],
    [count('skip'), 'sebaiknya dilewati'],
  ]
    .filter(([n]) => n)
    .map(([n, label]) => `${n} ${label}`);
  const todayPart = today ? `, ${today} hari ini` : '';
  return `${insights.length} sinyal dalam 5 hari terakhir${todayPart}. ${parts.join(', ')}.`;
}

/** "Hari ini", "Kemarin", or the weekday and date for the older days of the window. */
function dayLabel(date: string, today: string): string {
  const full = formatDate(date, { weekday: 'long', year: undefined });
  if (date === today) return `Hari ini · ${full}`;
  if (date === daysBefore(today, 1)) return `Kemarin · ${full}`;
  return full;
}

type SearchParams = Promise<{ siklus?: string; halaman?: string }>;

/**
 * The first visit of the WIB day waits for the cycle to be generated, so the
 * whole page streams in behind a loading screen. The boundary sits outside
 * AppShell: its entrance animation reveals the cards when it mounts, and
 * would miss cards streamed in after it.
 */
export default function BerandaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<CycleLoading />}>
      <Beranda searchParams={searchParams} />
    </Suspense>
  );
}

async function Beranda({ searchParams }: { searchParams: SearchParams }) {
  const { siklus, halaman } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests never touch profile data (BR-4); the proxy only lets finished profiles through
  const profile = user ? await fetchProfile(supabase, user.id) : null;

  const flavour: Flavour =
    user && profile
      ? { role: creativeRoleFor(profile.role), archetype: profile.archetype, brand: brandContextFor(user.id, profile) }
      : null;
  const time = profile?.notification_time?.slice(0, 5) ?? '06:00';
  // Switch for reviewing the no-signal branch (V6)
  const feed = await getRecentFeed(supabase, { time, quiet: siklus === 'sepi' });
  // Guests get Tier-1 sources only (BR-4)
  const cards = flavour ? feed.cards : feed.cards.filter((card) => sources[card.insight.source].tier === 1);
  const insights = cards.map((card) => card.insight);
  const todayCount = cards.filter((card) => card.cycleDate === feed.date).length;
  const nextCycle = `besok pukul ${feed.time} WIB`;
  const shown = feedPage(cards, halaman);
  // Keeps the prototype's quiet-day switch while paging
  const query = siklus ? new URLSearchParams({ siklus }).toString() : '';
  // Today has nothing to add, but the days before still do
  const todayNote =
    insights.length && !todayCount
      ? feed.status === 'unavailable'
        ? 'Siklus hari ini belum tersedia, Elias mencoba lagi dalam beberapa menit. Kartu di bawah dari hari-hari sebelumnya.'
        : 'Hari ini tidak ada pergerakan baru yang layak ditindaklanjuti. Kartu di bawah dari hari-hari sebelumnya.'
      : null;

  const market = targetMarketLabel(profile?.target_market);
  const context = flavour && [
    ['Peran', creativeRoleLabels[flavour.role]],
    ['Archetype', flavour.archetype ? archetypeDirections[flavour.archetype]?.name : null],
    ['Target', market],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <AppShell userId={user?.id ?? null}>
      <div className="flex flex-col gap-8 md:gap-10">
        <section data-animate="page-item" className="flex flex-col gap-3">
          <p className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">
            Siklus {formatDate(feed.date, { weekday: 'long' })} · {feed.time} WIB
          </p>
          <h1 className="max-w-4xl text-2xl font-bold md:text-display-sm laptop:text-display-md">
            {insights.length
              ? headline(insights, todayCount)
              : feed.status === 'unavailable'
                ? 'Feed hari ini belum tersedia.'
                : 'Hari ini sepi.'}
          </h1>
          <p className="text-md text-neutral-600">
            Kartu dari 5 hari terakhir; yang lebih lama dihapus otomatis. Siklus berikutnya {nextCycle}.
          </p>
          {context && context.length > 0 && (
            <ul aria-label="Disesuaikan untuk" className="flex flex-wrap gap-2 pt-1">
              {context.map(([label, value]) => (
                <li key={label} className="rounded-full border border-neutral-200 px-3 py-1 text-sm">
                  <span className="text-gray-600">{label}:</span> <span className="font-semibold">{value}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!flavour && <ProfilePrompt />}

        {todayNote && (
          <p data-animate="page-item" className="rounded-2xl border border-dashed border-disabled-surface p-4 text-md text-neutral-600 md:p-6">
            {todayNote}
          </p>
        )}

        {insights.length ? (
          <FeedPages
            page={shown.page}
            pageCount={shown.count}
            first={shown.first}
            last={shown.last}
            total={insights.length}
            query={query}
          >
            {groupByDay(shown.items).map((day) => (
              <section key={day.date} aria-label={dayLabel(day.date, feed.date)} className="flex flex-col gap-4">
                <h2 className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase">
                  {dayLabel(day.date, feed.date)}
                </h2>
                <div className="grid gap-4 md:gap-6 laptop:grid-cols-2">
                  {day.cards.map(({ insight }) => (
                    <InsightCard key={insight.id} insight={insight} flavour={flavour} />
                  ))}
                </div>
              </section>
            ))}
          </FeedPages>
        ) : feed.status === 'unavailable' ? (
          <CycleUnavailable />
        ) : (
          <QuietDay nextCycle={nextCycle} />
        )}
      </div>
    </AppShell>
  );
}
