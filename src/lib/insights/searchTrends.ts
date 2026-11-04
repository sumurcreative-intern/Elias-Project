import { daysBefore } from '../dates';
import { fetchSearchTrends, type SearchNews, type SearchTrend } from '../googleTrends';
import { createAdminClient } from '../supabase/admin';

// Google Trends captures
// (supabase/migrations/20261104110000_google_trends_snapshots.sql). The RSS
// feed only shows the newest ~10 searches, so one read at cycle time would
// see two hours of the day. Every capture, at most one an hour, is merged into
// a row per term per WIB day; the cycle reads the last 24 hours of them and
// how many days in a row each term has trended. Server only.

const CAPTURE_INTERVAL_MS = 3_600_000;
const WINDOW_MS = 24 * 3_600_000;
// How far back "days in a row" is counted
const HISTORY_DAYS = 7;
const MAX_TERMS = 20;

export type CapturedSearch = SearchTrend & {
  firstSeenAt: string;
  /** Consecutive WIB days up to the newest one the term was captured on, at least 1 */
  daysInRow: number;
};

type Row = {
  snapshot_date: string;
  term: string;
  approx_traffic: number;
  started_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  news: SearchNews[];
};

// On globalThis so dev-server reloads don't capture on every save
const store = globalThis as typeof globalThis & { eliasSearchCapture?: { lastAt: number; pending: Promise<SearchTrend[]> | null } };
store.eliasSearchCapture ??= { lastAt: 0, pending: null };
const state = store.eliasSearchCapture;

/** Merges one read of the feed into today's rows: highest traffic, first and last seen, newest news. */
async function capture(date: string): Promise<SearchTrend[]> {
  const feed = await fetchSearchTrends('ID');
  if (feed.status !== 'ok' || !feed.trends.length) return [];
  const admin = createAdminClient();
  if (!admin) return feed.trends;

  const now = new Date().toISOString();
  const { data: existing, error: readError } = await admin
    .from('google_trends_snapshots')
    .select('term, approx_traffic, started_at, first_seen_at')
    .eq('snapshot_date', date)
    .in('term', feed.trends.map((trend) => trend.term))
    .returns<Pick<Row, 'term' | 'approx_traffic' | 'started_at' | 'first_seen_at'>[]>();
  if (readError) console.error('Google Trends snapshots: reading failed', readError);
  const before = new Map((existing ?? []).map((row) => [row.term, row]));

  const rows = feed.trends.map((trend) => {
    const old = before.get(trend.term);
    return {
      snapshot_date: date,
      term: trend.term,
      approx_traffic: Math.max(trend.approxTraffic, old?.approx_traffic ?? 0),
      started_at: old?.started_at ?? trend.startedAt,
      first_seen_at: old?.first_seen_at ?? now,
      last_seen_at: now,
      // An empty news list never replaces stored articles
      ...(trend.news.length || !old ? { news: trend.news } : {}),
    };
  });
  const { error } = await admin.from('google_trends_snapshots').upsert(rows, { onConflict: 'snapshot_date,term' });
  if (error) console.error('Google Trends snapshots: saving failed', error);
  return feed.trends;
}

/**
 * Reads the feed and stores it, at most once an hour; cheap to call on every
 * request. Resolves to the feed's searches, or an empty list when skipped.
 */
export function captureSearchTrends(date: string): Promise<SearchTrend[]> {
  if (state.pending) return state.pending;
  if (Date.now() - state.lastAt < CAPTURE_INTERVAL_MS) return Promise.resolve([]);
  state.lastAt = Date.now();
  state.pending = capture(date).finally(() => (state.pending = null));
  return state.pending;
}

function daysInRow(dates: Set<string>, newest: string): number {
  let days = 1;
  while (days < HISTORY_DAYS && dates.has(daysBefore(newest, days))) days++;
  return days;
}

/**
 * Searches seen in the last 24 hours, highest traffic first. Captures first,
 * so the cycle always has the current feed even when nobody visited lately;
 * without the secret key it falls back to that single read.
 */
export async function recentSearchTrends(date: string): Promise<CapturedSearch[]> {
  state.lastAt = 0;
  const live = await captureSearchTrends(date);
  const admin = createAdminClient();
  if (!admin) {
    const now = new Date().toISOString();
    return live.slice(0, MAX_TERMS).map((trend) => ({ ...trend, firstSeenAt: now, daysInRow: 1 }));
  }

  const { data, error } = await admin
    .from('google_trends_snapshots')
    .select('snapshot_date, term, approx_traffic, started_at, first_seen_at, last_seen_at, news')
    .gte('snapshot_date', daysBefore(date, HISTORY_DAYS))
    .lte('snapshot_date', date)
    .returns<Row[]>();
  if (error) {
    console.error('Google Trends snapshots: reading failed', error);
    return [];
  }

  const datesOf = new Map<string, Set<string>>();
  for (const row of data) datesOf.set(row.term, (datesOf.get(row.term) ?? new Set()).add(row.snapshot_date));

  // A term seen yesterday evening and again today keeps its newest row
  const since = Date.now() - WINDOW_MS;
  const latest = new Map<string, Row>();
  for (const row of data) {
    if (Date.parse(row.last_seen_at) < since) continue;
    const kept = latest.get(row.term);
    if (!kept || row.snapshot_date > kept.snapshot_date) latest.set(row.term, row);
  }

  return [...latest.values()]
    .sort((a, b) => b.approx_traffic - a.approx_traffic)
    .slice(0, MAX_TERMS)
    .map((row) => ({
      term: row.term,
      approxTraffic: row.approx_traffic,
      startedAt: row.started_at,
      news: row.news,
      firstSeenAt: row.first_seen_at,
      daysInRow: daysInRow(datesOf.get(row.term)!, row.snapshot_date),
    }));
}
