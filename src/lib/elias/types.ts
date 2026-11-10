import type { CreativeRole } from '../creativeRoles';
import type { NewsContext } from '../gdelt';
import type { Verdict } from '../insights/types';
import type { YouTubeTrends, YouTubeVideo } from '../youtube';

export type { NewsArticle, NewsContext } from '../gdelt';
export type { YouTubeTrends, YouTubeVideo } from '../youtube';

/**
 * What Elias knows about the brand. `id` is the cache and ownership key; it
 * is the user id until brand_profile exists, then becomes brand_profile_id
 * (DM-4, docs/MVP.md MVP 4).
 */
export type BrandContext = {
  id: string;
  category: string | null;
  archetype: string | null;
  targetMarket: string | null;
  location: string | null;
  localFocus: boolean;
  /** goals[0] is the primary goal */
  goals: string[];
};

/**
 * What the daily cycle already knows about the trend, beyond its one-line
 * signal. Without it every call leans on the brand facts, which are the same
 * for every card, and the answers blur together.
 */
export type TrendDetails = {
  /** Source label, e.g. "YouTube" */
  source: string;
  /** ISO date the source observed the movement */
  observedOn: string;
  tags: string[];
  lifecycle: string | null;
  whyItMatters: string;
  /** The cycle's call for every brand, before this brand is weighed */
  generalVerdict: Verdict;
  /** What the card is based on: video or article titles, with channel or domain */
  evidence: { title: string; detail: string }[];
};

export type InsightRequest = {
  brandContext: BrandContext;
  trendTopic: string;
  userRole: CreativeRole;
  trendDetails?: TrendDetails;
  /**
   * Short keywords for the GDELT news lookup, e.g. ["matcha"]; any of them
   * may match. A whole trend sentence matches no articles, so without them the
   * server looks for a quoted term inside trendTopic and skips the news lookup
   * if there is none.
   */
  newsKeywords?: string[];
};

/** Shared by the server and client caches: identical requests never hit OpenRouter twice. */
export function insightCacheKey({ brandContext, trendTopic, userRole }: InsightRequest): string {
  // v2: calls grounded on the trend's details; v1 answers were too generic to keep serving
  return `v2_${brandContext.id}_${trendTopic}_${userRole}`;
}

export const executionFormats = ['carousel', 'story', 'short_video', 'single_post', 'long_video', 'thread', 'none'] as const;
export type ExecutionFormat = (typeof executionFormats)[number];

export const executionFormatLabels: Record<ExecutionFormat, string> = {
  carousel: 'Carousel',
  story: 'Story',
  short_video: 'Short-form video',
  single_post: 'Single post',
  long_video: 'Video panjang',
  thread: 'Thread',
  none: 'Tanpa eksekusi',
};

/** Decision first, reason second. */
export type EliasInsight = {
  decision: Verdict;
  /** One sentence that opens with the decision or a number */
  headline: string;
  /** Why it matters to this role, for this brand */
  soWhat: string;
  action: {
    format: ExecutionFormat;
    angle: string;
    /** Empty when the decision is skip */
    steps: string[];
  };
  /**
   * Ready-to-use copy in the brand's archetype tone, for its target market.
   * Absent on a skip, and on answers cached before it existed
   */
  copy?: CopySuggestion;
  /** One-line rationale */
  why: string;
};

export type CopySuggestion = {
  /** The opening line: first frame, first slide or first sentence */
  hook: string;
  caption: string;
  cta: string;
};

export type RecommendationStatus = 'EXECUTE_TODAY' | 'WATCH' | 'SKIP';

export const recommendationStatus: Record<Verdict, RecommendationStatus> = {
  act: 'EXECUTE_TODAY',
  watch: 'WATCH',
  skip: 'SKIP',
};

export type InsightErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'daily_limit'
  | 'rate_limited'
  | 'user_limit'
  | 'not_configured'
  | 'upstream'
  | 'bad_output';

export type InsightError = {
  code: InsightErrorCode;
  /** Indonesian, ready to show as-is */
  message: string;
  /** Seconds until a retry can succeed, when known */
  retryAfter?: number;
};

export type InsightResponse =
  | {
      ok: true;
      insight: EliasInsight;
      model: string;
      cached: boolean;
      /** The news the call was grounded on, whatever its status */
      news: NewsContext;
      /** General YouTube trending chart for the region, not videos about the trend */
      youtube: YouTubeTrends;
      // Flat fields for consumers that want the call without the structure
      /** The "1. [domain] Title" lines when GDELT returned articles, else null */
      gdeltSource: string | null;
      youtubeData: YouTubeVideo[];
      /** WATCH is the PRD's "Pantau": too early or too risky to call */
      recommendation_status: RecommendationStatus;
      action_format: string;
      /** The whole call as one plain-text brief */
      result: string;
    }
  | { ok: false; error: InsightError };
