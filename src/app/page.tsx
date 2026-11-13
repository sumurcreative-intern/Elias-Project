import type { User } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { userAgent } from 'next/server';
import { Suspense } from 'react';
import AppShell from '@/components/app/AppShell';
import BerandaBackdrop from '@/components/beranda/BerandaBackdrop';
import CycleGate, { CyclePending } from '@/components/beranda/CycleGate';
import CycleUnavailable from '@/components/beranda/CycleUnavailable';
import FeedFilters, { type FilterRow } from '@/components/beranda/FeedFilters';
import FeedPages from '@/components/beranda/FeedPages';
import InsightCard, { type Flavour } from '@/components/beranda/InsightCard';
import MasonryGrid from '@/components/beranda/MasonryGrid';
import MotionText from '@/components/motion/MotionText';
import PersonaToggle from '@/components/beranda/PersonaToggle';
import ProfilePrompt from '@/components/beranda/ProfilePrompt';
import QuietDay from '@/components/beranda/QuietDay';
import TrendingTopics from '@/components/beranda/TrendingTopics';
import { verdicts } from '@/components/beranda/VerdictTab';
import { archetypeDirections } from '@/lib/archetypes';
import { brandCategoryLabels, isBrandCategory } from '@/lib/brandCategories';
import { creativeRoleFor, creativeRoleLabels } from '@/lib/creativeRoles';
import { daysBefore, formatDate } from '@/lib/dates';
import { brandContextFor, fetchProfile } from '@/lib/elias/brandProfile';
import { fitsBrand, rankForAudience } from '@/lib/insights/brandFit';
import { feedPage, feedPageSize, groupByDay, mobileFeedPageSize } from '@/lib/insights/feed';
import { getRecentFeed } from '@/lib/insights/live';
import { getTrending } from '@/lib/insights/trending';
import type { StoredCard } from '@/lib/insights/store';
import { sources, type Verdict } from '@/lib/insights/types';
import { createClient } from '@/lib/supabase/server';
import { isAudienceMarket, targetMarketLabel } from '@/lib/targetMarkets';

export const metadata: Metadata = {
  title: 'Beranda — Elias',
};

/** "Terdapat 5 Trend Hari Ini yang Cocok untuk Brand Kamu.": the count, never a greeting (V2). */
function headline(today: number, total: number, scoped: boolean): { text: string; accent: string } {
  const accent = today ? `${today} Trend Hari Ini` : `${total} Trend dalam 5 Hari Terakhir`;
  return { text: `Terdapat ${accent} ${scoped ? 'yang Cocok untuk Brand Kamu.' : 'untuk Kamu Pantau.'}`, accent };
}

/** "Hari ini - Jumat, 13 November 2026", "Kemarin - …", or the date for the older days of the window. */
function dayLabel(date: string, today: string): string {
  const full = formatDate(date, { weekday: 'long' });
  if (date === today) return `Hari ini - ${full}`;
  if (date === daysBefore(today, 1)) return `Kemarin - ${full}`;
  return full;
}

// `/?status=eksekusi`: the verdicts by the names on their tabs
const statusParams: Record<Verdict, string> = { act: 'eksekusi', watch: 'pantau', skip: 'lewati' };
const verdictOrder: Verdict[] = ['act', 'watch', 'skip'];

type SearchParams = Promise<{ siklus?: string; halaman?: string; tampil?: string; waktu?: string; status?: string }>;

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
  const { siklus, halaman, tampil, waktu, status } = await searchParams;
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

  const isToday = (card: StoredCard) => card.cycleDate === feed.date;
  const todayCount = cards.filter(isToday).length;
  const nextCycle = `besok pukul ${feed.time} WIB`;

  // Time, then status, narrow the view; each filter row counts within the rows above it
  const todayOnly = waktu === 'hari-ini';
  const timeCards = todayOnly ? cards.filter(isToday) : cards;
  const verdict = verdictOrder.find((v) => statusParams[v] === status) ?? null;
  const filtered = verdict ? timeCards.filter((card) => card.insight.verdict === verdict) : timeCards;
  // Phones page through 5 cards at a time, read from the user agent since paging happens on the server
  const { device } = userAgent({ headers: await headers() });
  const shown = feedPage(filtered, halaman, device.type === 'mobile' ? mobileFeedPageSize : feedPageSize);

  // Every filter link keeps the other filters, and the prototype's quiet-day switch, minus the page
  const current = {
    siklus,
    tampil: wantsAll ? 'semua' : undefined,
    waktu: todayOnly ? 'hari-ini' : undefined,
    status: verdict ? statusParams[verdict] : undefined,
  };
  const searchWith = (change: Partial<typeof current>) =>
    new URLSearchParams(
      Object.entries({ ...current, ...change }).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ).toString();
  const hrefWith = (change: Partial<typeof current>) => {
    const search = searchWith(change);
    return search ? `/?${search}` : '/';
  };

  const filterRows: FilterRow[] = [];
  if (brand && allCards.length > 0) {
    filterRows.push({
      by: 'kategori',
      options: [
        { label: brand.label, count: brandCards.length, href: hrefWith({ tampil: undefined }), active: scoped },
        { label: 'Semua', count: allCards.length, href: hrefWith({ tampil: 'semua' }), active: !scoped },
      ],
    });
  }
  if (cards.length > 0) {
    filterRows.push(
      {
        by: 'waktu',
        options: [
          { label: 'Tren Hari Ini Saja', count: todayCount, href: hrefWith({ waktu: 'hari-ini' }), active: todayOnly },
          { label: 'Semua', count: cards.length, href: hrefWith({ waktu: undefined }), active: !todayOnly },
        ],
      },
      {
        by: 'status',
        options: [
          ...verdictOrder.map((v) => ({
            label: verdicts[v].label,
            count: timeCards.filter((card) => card.insight.verdict === v).length,
            href: hrefWith({ status: statusParams[v] }),
            active: verdict === v,
          })),
          { label: 'Semua', count: timeCards.length, href: hrefWith({ status: undefined }), active: !verdict },
        ],
      },
    );
  }

  const feedNote = !cards.length
    ? null
    : brand && !wantsAll && !brandCards.length
      ? <>Belum ada tren yang cocok untuk brand <strong>{brand.label}</strong> dalam 5 hari terakhir, jadi <strong>semua tren ditampilkan</strong>.</>
      : !filtered.length
        ? todayOnly && !todayCount
          ? <>Hari ini <strong>belum ada tren</strong> di tampilan ini. Pilih <strong>Semua</strong> pada filter waktu untuk melihat hari-hari sebelumnya.</>
          : <>Tidak ada tren berstatus <strong>{verdict && verdicts[verdict].label}</strong> di tampilan ini.</>
        : todayCount || todayOnly
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
  const title = cards.length ? headline(todayCount, cards.length, scoped) : null;
  const cycleChip = 'bg-primary px-3 py-2 font-mono text-sm font-bold text-txt-white uppercase md:px-6 md:py-3 md:text-md';

  return (
    <AppShell userId={user?.id ?? null} backdrop={<BerandaBackdrop />}>
      <div className="flex flex-col gap-8">
        <section data-animate="page-item" className="flex flex-col items-start gap-[18px]">
          <p className="flex flex-wrap gap-3">
            <span className={cycleChip}>Siklus {formatDate(feed.date, { weekday: 'long' })}</span>
            <span className={cycleChip}>{feed.time} WIB</span>
          </p>
          <MotionText
            as="h1"
            effect="scramble"
            delay={0.25}
            text={title ? title.text : feed.status === 'unavailable' ? 'Feed hari ini belum tersedia.' : 'Hari ini sepi.'}
            accent={title ? { words: title.accent, className: 'text-primary' } : undefined}
            className="max-w-[998px] text-display-md font-bold md:text-display-lg laptop:text-display-2xl"
          />
          {context && context.length > 0 && <PersonaToggle context={context} />}
        </section>

        {!flavour && <ProfilePrompt />}

        <TrendingTopics initial={trending} brandLabel={brand?.label ?? null} />

        {filterRows.length > 0 && <FeedFilters rows={filterRows} />}

        {feedNote && (
          <p data-animate="page-item" className="rounded-xl border border-dashed border-disabled-surface p-4 text-md text-neutral-600 md:p-6">
            {feedNote}
          </p>
        )}

        {filtered.length ? (
          <FeedPages
            page={shown.page}
            pageCount={shown.count}
            first={shown.first}
            last={shown.last}
            total={filtered.length}
            query={searchWith({})}
          >
            {groupByDay(shown.items).map((day) => (
              <section key={day.date} aria-label={dayLabel(day.date, feed.date)} className="flex flex-col gap-[18px]">
                <MotionText
                  as="h2"
                  effect="type"
                  text={dayLabel(day.date, feed.date)}
                  className="border-l-2 border-primary pl-2 text-lg font-medium text-primary uppercase md:text-xl"
                />
                <MasonryGrid>
                  {day.cards.map(({ insight }) => (
                    <InsightCard key={insight.id} insight={insight} flavour={flavour} />
                  ))}
                </MasonryGrid>
              </section>
            ))}
          </FeedPages>
        ) : cards.length ? null : feed.status === 'unavailable' ? (
          <CycleUnavailable />
        ) : (
          <QuietDay nextCycle={nextCycle} />
        )}
      </div>
    </AppShell>
  );
}
