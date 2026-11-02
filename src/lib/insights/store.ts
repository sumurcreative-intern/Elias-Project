import type { SupabaseClient } from '@supabase/supabase-js';
import { creativeRoleLabels, type CreativeRole } from '../creativeRoles';
import { daysBefore } from '../dates';
import { createAdminClient } from '../supabase/admin';
import { sources, type Evidence, type Insight, type SourceId, type Verdict } from './types';

// Stored daily cycles (supabase/migrations/20261102120000_insight_cycles.sql).
// Beranda shows today and the 4 days before; pg_cron deletes anything older
// every night, and the read policy hides it even if a run is missed.

/** Days of cycles Beranda shows, today included. Keep in sync with insight_window_start(). */
export const feedWindowDays = 5;

export type StoredCard = { cycleDate: string; insight: Insight };

type InsightRow = {
  id: string;
  cycle_date: string;
  position: number;
  source: string;
  category: string;
  tags: string[];
  observed_on: string;
  signal: string;
  lifecycle: string | null;
  verdict: string;
  why_it_matters: string;
  recommendations: unknown;
  evidence: unknown;
};

const roles = Object.keys(creativeRoleLabels) as CreativeRole[];

function isEvidence(value: unknown): value is Evidence {
  if (typeof value !== 'object' || value === null) return false;
  const { title, url, detail } = value as Record<string, unknown>;
  return typeof title === 'string' && typeof url === 'string' && typeof detail === 'string';
}

/** Rows are written by our own generator, but jsonb is still checked before it reaches a card. */
function toInsight(row: InsightRow): Insight | null {
  if (!(row.source in sources) || !['act', 'watch', 'skip'].includes(row.verdict)) return null;
  const recs = row.recommendations as Record<string, unknown> | null;
  if (!recs || !roles.every((role) => typeof recs[role] === 'string')) return null;
  return {
    id: row.id,
    source: row.source as SourceId,
    category: row.category,
    tags: row.tags,
    observedOn: row.observed_on,
    signal: row.signal,
    ...(row.lifecycle && { lifecycle: row.lifecycle }),
    verdict: row.verdict as Verdict,
    whyItMatters: row.why_it_matters,
    recommendations: recs as Record<CreativeRole, string>,
    evidence: Array.isArray(row.evidence) ? row.evidence.filter(isEvidence) : [],
  };
}

export type StoredWindow = {
  /** Days in the window that already have a cycle, quiet days included */
  cycleDates: Set<string>;
  /** Newest day first, in the generator's order within a day */
  cards: StoredCard[];
};

/** Every stored card from the last 5 days. Readable by guests too, through RLS. */
export async function readWindow(supabase: SupabaseClient, today: string): Promise<StoredWindow> {
  const from = daysBefore(today, feedWindowDays - 1);
  const [cycles, cards] = await Promise.all([
    supabase.from('insight_cycles').select('cycle_date').gte('cycle_date', from),
    supabase
      .from('insights')
      .select(
        'id, cycle_date, position, source, category, tags, observed_on, signal, lifecycle, verdict, why_it_matters, recommendations, evidence',
      )
      .gte('cycle_date', from)
      .order('cycle_date', { ascending: false })
      .order('position', { ascending: true })
      .returns<InsightRow[]>(),
  ]);
  if (cycles.error || cards.error) console.error('Insight store: read failed', cycles.error ?? cards.error);

  return {
    cycleDates: new Set((cycles.data ?? []).map((row) => row.cycle_date as string)),
    cards: (cards.data ?? []).flatMap((row) => {
      const insight = toInsight(row);
      return insight ? [{ cycleDate: row.cycle_date, insight }] : [];
    }),
  };
}

/**
 * Saves a generated day once. If another server instance already saved this
 * day, its cycle wins and these cards are dropped, so the feed never doubles.
 */
export async function saveCycle(date: string, insights: Insight[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn('Insight store: SUPABASE_SECRET_KEY is not set, so today\'s cycle is kept in memory only');
    return;
  }

  const { data: created, error } = await admin
    .from('insight_cycles')
    .upsert({ cycle_date: date }, { onConflict: 'cycle_date', ignoreDuplicates: true })
    .select('cycle_date');
  if (error) {
    console.error('Insight store: saving the cycle failed', error);
    return;
  }
  if (!created?.length || !insights.length) return;

  const { error: cardsError } = await admin.from('insights').insert(
    insights.map((insight, position) => ({
      id: insight.id,
      cycle_date: date,
      position,
      source: insight.source,
      category: insight.category,
      tags: insight.tags,
      observed_on: insight.observedOn,
      signal: insight.signal,
      lifecycle: insight.lifecycle ?? null,
      verdict: insight.verdict,
      why_it_matters: insight.whyItMatters,
      recommendations: insight.recommendations,
      evidence: insight.evidence ?? [],
    })),
  );
  if (cardsError) {
    console.error('Insight store: saving the cards failed', cardsError);
    // A cycle row without its cards would read as a quiet day; drop it so the day is generated again
    await admin.from('insight_cycles').delete().eq('cycle_date', date);
  }
}
