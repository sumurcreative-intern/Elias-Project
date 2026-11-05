import type { BrandCategory } from '../brandCategories';
import type { CreativeRole } from '../creativeRoles';

/**
 * Sources Elias can actually query (PRD Ch. 9). TikTok and Instagram are
 * deliberately absent: no card may imply coverage of them (BR-5, DS-3).
 */
export type SourceId = 'google_trends' | 'youtube' | 'gdelt' | 'reddit' | 'x';

export const sources: Record<SourceId, { label: string; tier: 1 | 2 }> = {
  google_trends: { label: 'Google Trends', tier: 1 },
  youtube: { label: 'YouTube', tier: 1 },
  gdelt: { label: 'GDELT', tier: 1 },
  reddit: { label: 'Reddit', tier: 2 },
  x: { label: 'X', tier: 2 },
};

/** Elias's call on the signal. "skip" is a first-class answer, not a missing one. */
export type Verdict = 'act' | 'watch' | 'skip';

/** A source item a card is based on: a trending video or a news article. */
export type Evidence = {
  title: string;
  url: string;
  /** Channel or domain, plus the view count for videos */
  detail: string;
};

/**
 * Minimum card anatomy from BR-2: signal, source, role-flavoured
 * recommendation. The full field list is Open Question 2.7.
 */
export type Insight = {
  id: string;
  source: SourceId;
  category: string;
  /**
   * Brand categories with a real angle in this trend, possibly none. Absent
   * on cards stored before the cycle tagged them: fall back to `category`
   */
  brandCategories?: BrandCategory[];
  /** Target markets (profiles.target_market ids) the trend reaches; absent on untagged cards */
  audiences?: string[];
  tags: string[];
  /** When the source observed the movement (ISO date) */
  observedOn: string;
  /** The claim. Only states what the evidence shows: no growth figures without a measured baseline */
  signal: string;
  /** Where the trend sits in its life cycle, when that decides the call */
  lifecycle?: string;
  verdict: Verdict;
  /** Same for every brand and every guest (V4) */
  whyItMatters: string;
  recommendations: Record<CreativeRole, string>;
  /** What the card is based on, shown as links so the reader can check it */
  evidence?: Evidence[];
};

/** One bounded batch of cards; the feed only changes when a new cycle runs (BR-1). */
export type Cycle = {
  /** Cycle date in WIB (ISO date) */
  date: string;
  /** Run time in WIB, "HH:MM" */
  time: string;
  /** Empty on a quiet day (V6) */
  insights: Insight[];
  /** "unavailable" when the sources or the model failed: not the same as a quiet day */
  status: 'ok' | 'unavailable';
};
