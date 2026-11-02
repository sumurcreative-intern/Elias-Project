import type { NewsContext } from '../gdelt';
import type { YouTubeTrends } from '../youtube';
import type { EliasInsight } from './types';

// Free-tier safeguards (50 requests/day on OpenRouter). Both live in this
// server instance's memory: enough for one long-running server, but each
// serverless instance starts empty. Move to the database or a KV store before
// running on more than one instance.

type Cached = { insight: EliasInsight; model: string; news: NewsContext; youtube: YouTubeTrends; expiresAt: number };

const MAX_ENTRIES = 500;
const cache = new Map<string, Cached>();
// Identical requests already on their way share one upstream call
const inFlight = new Map<string, Promise<unknown>>();

/** Insights follow the daily cycle, so a cached answer lives until midnight WIB. */
function endOfDayInJakarta(now = Date.now()): number {
  const WIB_OFFSET = 7 * 3_600_000;
  const day = 86_400_000;
  return Math.floor((now + WIB_OFFSET) / day) * day + day - WIB_OFFSET;
}

export function getCachedInsight(key: string): Cached | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedInsight(
  key: string,
  insight: EliasInsight,
  model: string,
  news: NewsContext,
  youtube: YouTubeTrends,
) {
  // Maps keep insertion order, so the first key is the oldest
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { insight, model, news, youtube, expiresAt: endOfDayInJakarta() });
}

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// Keeps one account from spending the whole shared daily quota
const USER_DAILY_LIMIT = Number(process.env.ELIAS_USER_DAILY_LIMIT) || 10;
const usage = new Map<string, { count: number; resetsAt: number }>();

/** Counts a fresh (uncached) generation; false once the user is over today's limit. */
export function takeUserBudget(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let entry = usage.get(userId);
  if (!entry || entry.resetsAt <= now) {
    entry = { count: 0, resetsAt: endOfDayInJakarta(now) };
    usage.set(userId, entry);
  }
  const retryAfter = Math.ceil((entry.resetsAt - now) / 1000);
  if (entry.count >= USER_DAILY_LIMIT) return { allowed: false, retryAfter };
  entry.count += 1;
  return { allowed: true, retryAfter };
}

/** Gives a budget unit back when the upstream call didn't produce an answer. */
export function refundUserBudget(userId: string) {
  const entry = usage.get(userId);
  if (entry && entry.count > 0) entry.count -= 1;
}
