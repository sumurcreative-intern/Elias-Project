import type { User } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import AppShell from '@/components/app/AppShell';
import CycleGate, { CyclePending } from '@/components/beranda/CycleGate';
import CycleUnavailable from '@/components/beranda/CycleUnavailable';
import FeedPages from '@/components/beranda/FeedPages';
import FeedScope from '@/components/beranda/FeedScope';
import InsightCard, { type Flavour } from '@/components/beranda/InsightCard';
import MasonryGrid from '@/components/beranda/MasonryGrid';
import MotionText from '@/components/motion/MotionText';
import ProfilePrompt from '@/components/beranda/ProfilePrompt';
import QuietDay from '@/components/beranda/QuietDay';
import TrendingTopics from '@/components/beranda/TrendingTopics';
import { archetypeDirections } from '@/lib/archetypes';
import { brandCategoryLabels, isBrandCategory } from '@/lib/brandCategories';
import { creativeRoleFor, creativeRoleLabels } from '@/lib/creativeRoles';
import { daysBefore, formatDate } from '@/lib/dates';
import { brandContextFor, fetchProfile } from '@/lib/elias/brandProfile';
import { fitsBrand, rankForAudience } from '@/lib/insights/brandFit';
import { feedPage, groupByDay } from '@/lib/insights/feed';
import { getRecentFeed } from '@/lib/insights/live';
import { getTrending } from '@/lib/insights/trending';
import type { StoredCard } from '@/lib/insights/store';
import { sources, type Insight } from '@/lib/insights/types';
import { createClient } from '@/lib/supabase/server';
import { isAudienceMarket, targetMarketLabel } from '@/lib/targetMarkets';

export const metadata: Metadata = {
  title: 'Beranda — Elias',
};

/** Opens with the count, never a greeting (V2): "18 sinyal dalam 5 hari terakhir, 4 hari ini. 7 layak dieksekusi, …" */
function headline(insights: Insight[], today: number, brandLabel?: string): string {
  const count = (verdict: Insight['verdict']) => insights.filter((insight) => insight.verdict === verdict).length;
  const parts = [
    [count('act'), 'layak dieksekusi'],
    [count('watch'), 'dipantau'],
    [count('skip'), 'sebaiknya dilewati'],
  ]
    .filter(([n]) => n)
    .map(([n, label]) => `${n} ${label}`);
  const todayPart = today ? `, ${today} hari ini` : '';
  const scope = brandLabel ? ` untuk brand ${brandLabel}` : '';
  return `${insights.length} sinyal${scope} dalam 5 hari terakhir${todayPart}. ${parts.join(', ')}.`;
}

/** "Hari ini", "Kemarin", or the weekday and date for the older days of the window. */
function dayLabel(date: string, today: string): string {
  const full = formatDate(date, { weekday: 'long', year: undefined });
  if (date === today) return `Hari ini · ${full}`;
  if (date === daysBefore(today, 1)) return `Kemarin · ${full}`;
  return full;
}

type SearchParams = Promise<{ siklus?: string; halaman?: string; tampil?: string }>;

/**
 * The first visit of the WIB day waits for the cycle to be generated, so the
 * whole page streams in behind a loading screen, which CycleGate keeps up
 * until its bar has filled to 100%. The boundary sits outside
 * AppShell: its entrance animation reveals the cards when it mounts, and
 * would miss cards streamed in after it.
 */
export default async function BerandaPage({ searchParams }: { searchParams: SearchParams }) {
  // Read before the boundary so the loading screen's header shows the right actions
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <CycleGate signedIn={user !== null}>
      <Suspense fallback={<CyclePending />}>
        <Beranda searchParams={searchParams} user={user} />
      </Suspense>
    </CycleGate>
  );
}

async function Beranda({ searchParams, user }: { searchParams: SearchParams; user: User | null }) {
  const { siklus, halaman, tampil } = await searchParams;
  const supabase = await createClient();

  // Guests never touch profile data (BR-4); the proxy only lets finished profiles through
  const profile = user ? await fetchProfile(supabase, user.id) : null;

  const flavour: Flavour =
    user && profile
      ? { role: creativeRoleFor(profile.role), archetype: profile.archetype, brand: brandContextFor(user.id, profile) }
      : null;
  const time = profile?.notification_time?.slice(0, 5) ?? '06:00';
  // Switch for reviewing the no-signal branch (V6)
  const feed = await getRecentFeed(supabase, { time, quiet: siklus === 'sepi' });
  // After the feed, so the first visit of the day reads the charts its cycle just stored
  const trending = await getTrending(feed.date);
  // Guests get Tier-1 sources only (BR-4)
  const allCards = flavour ? feed.cards : feed.cards.filter((card) => sources[card.insight.source].tier === 1);

  // Signed-in users open on the cards for their brand; guests and profiles
  // without a category keep the whole feed. Nothing fitting falls back to all
  const category = profile?.category;
  const brand = flavour && isBrandCategory(category) ? { id: category, label: brandCategoryLabels[category] } : null;
  const brandCards = brand ? allCards.filter((card) => fitsBrand(card.insight, brand.id)) : [];
  const wantsAll = tampil === 'semua';
  const scoped = Boolean(brand) && !wantsAll && brandCards.length > 0;
  // Then those reaching the brand's target market first, within each day and verdict
  const targetMarket = profile?.target_market;
  const viewCards = scoped ? brandCards : allCards;
  const cards = flavour && isAudienceMarket(targetMarket) ? rankForAudience(viewCards, targetMarket) : viewCards;

  const insights = cards.map((card) => card.insight);
  const isToday = (card: StoredCard) => card.cycleDate === feed.date;
  const todayCount = cards.filter(isToday).length;
  const nextCycle = `besok pukul ${feed.time} WIB`;
  const shown = feedPage(cards, halaman);
  // Keeps the prototype's quiet-day switch, without the page, across views
  const viewQuery = siklus ? new URLSearchParams({ siklus }).toString() : '';
  // ...and the view itself while paging
  const query = new URLSearchParams({ ...(siklus && { siklus }), ...(wantsAll && { tampil }) }).toString();
  const todayNote = !insights.length
    ? null
    : brand && !wantsAll && !brandCards.length
      ? <>Belum ada tren yang cocok untuk brand <strong>{brand.label}</strong> dalam 5 hari terakhir, jadi <strong>semua tren ditampilkan</strong>.</>
      : todayCount
        ? null
        : scoped && allCards.some(isToday)
          ? <>Hari ini belum ada tren yang cocok untuk brand <strong>{brand?.label}</strong>. Kartu di bawah dari hari-hari sebelumnya; tren lain hari ini ada di <strong>Semua</strong>.</>
          : // Today has nothing to add, but the days before still do
            feed.status === 'unavailable'
            ? <><strong>Siklus hari ini belum tersedia</strong>, Elias mencoba lagi dalam beberapa menit. Kartu di bawah dari hari-hari sebelumnya.</>
            : <>Hari ini <strong>tidak ada pergerakan baru</strong> yang layak ditindaklanjuti. Kartu di bawah dari hari-hari sebelumnya.</>;

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
          <MotionText
            as="p"
            effect="type"
            delay={0.1}
            text={`Siklus ${formatDate(feed.date, { weekday: 'long' })} · ${feed.time} WIB`}
            className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase"
          />
          <MotionText
            as="h1"
            effect="scramble"
            delay={0.25}
            text={
              insights.length
                ? headline(insights, todayCount, scoped ? brand?.label : undefined)
                : feed.status === 'unavailable'
                  ? 'Feed hari ini belum tersedia.'
                  : 'Hari ini sepi.'
            }
            className="max-w-4xl text-2xl font-bold md:text-display-sm laptop:text-display-md"
          />
          <p className="text-md text-neutral-600">
            Kartu dari <strong>5 hari terakhir</strong>; yang lebih lama dihapus otomatis. Siklus berikutnya <strong>{nextCycle}</strong>.
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

        <TrendingTopics initial={trending} brandLabel={brand?.label ?? null} />

        {brand && allCards.length > 0 && (
          <FeedScope
            brandLabel={brand.label}
            brandCount={brandCards.length}
            allCount={allCards.length}
            active={scoped ? 'brand' : 'all'}
            query={viewQuery}
          />
        )}

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
                <MotionText
                  as="h2"
                  effect="type"
                  text={dayLabel(day.date, feed.date)}
                  className="font-mono text-xs font-bold tracking-wide text-gray-600 uppercase"
                />
                <MasonryGrid>
                  {day.cards.map(({ insight }) => (
                    <InsightCard key={insight.id} insight={insight} flavour={flavour} />
                  ))}
                </MasonryGrid>
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
