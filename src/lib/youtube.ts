// YouTube Data API v3: what is trending on YouTube in a region right now.
// Server only: reads YOUTUBE_API_KEY.
//
// videos.list?chart=mostPopular costs 1 quota unit per call out of 10,000 a
// day. The chart is the same for every user, so one cached fetch per region
// per hour (~24 units a day) covers the whole app. Note it is the general
// chart, not videos about any particular trend: as checked on 2 Nov 2026 the
// Indonesian top three were a song, a drama trailer and a Roblox video.

const ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const CACHE_TTL_MS = 3_600_000;

export type YouTubeVideo = {
  id: string;
  title: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number | null;
  commentCount: number | null;
  /** ISO timestamp, null when YouTube sends none */
  publishedAt: string | null;
  /** ISO 8601 duration ("PT58S"), null when YouTube sends none */
  duration: string | null;
  /** Creator-set tags; often empty */
  tags: string[];
  /** Medium thumbnail URL on i.ytimg.com, null when YouTube sends none */
  thumbnail: string | null;
};

export type YouTubeTrends = {
  status: 'ok' | 'not_configured' | 'quota' | 'error';
  regionCode: string;
  /** YouTube video category id ("26" = Howto & Style), absent for the general chart */
  categoryId?: string;
  videos: YouTubeVideo[];
};

type ApiVideo = {
  id?: unknown;
  snippet?: {
    title?: unknown;
    channelTitle?: unknown;
    publishedAt?: unknown;
    tags?: unknown;
    thumbnails?: { medium?: { url?: unknown }; default?: { url?: unknown } };
  };
  statistics?: { viewCount?: unknown; likeCount?: unknown; commentCount?: unknown };
  contentDetails?: { duration?: unknown };
};

// Successful answers only, keyed by region and size
const cache = new Map<string, { trends: YouTubeTrends; expiresAt: number }>();
// Concurrent misses share one request
const inFlight = new Map<string, Promise<YouTubeTrends>>();

function thumbnailUrl(video: ApiVideo): string | null {
  const url = video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url;
  // Rendered with next/image, which only allows this host (next.config.ts)
  return typeof url === 'string' && url.startsWith('https://i.ytimg.com/') ? url : null;
}

/** Counts arrive as strings; hidden like or comment counts are absent. */
function count(value: unknown): number | null {
  const n = Number(value);
  return value === undefined || !Number.isFinite(n) ? null : n;
}

function parseVideos(data: unknown): YouTubeVideo[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  return (items as ApiVideo[])
    .filter((v) => typeof v.id === 'string' && typeof v.snippet?.title === 'string')
    .map((v) => ({
      id: v.id as string,
      title: (v.snippet!.title as string).slice(0, 200),
      channelTitle: typeof v.snippet?.channelTitle === 'string' ? v.snippet.channelTitle : '',
      viewCount: Number(v.statistics?.viewCount) || 0,
      likeCount: count(v.statistics?.likeCount),
      commentCount: count(v.statistics?.commentCount),
      publishedAt: typeof v.snippet?.publishedAt === 'string' ? v.snippet.publishedAt : null,
      duration: typeof v.contentDetails?.duration === 'string' ? v.contentDetails.duration : null,
      tags: Array.isArray(v.snippet?.tags)
        ? v.snippet.tags.filter((t): t is string => typeof t === 'string').slice(0, 15).map((t) => t.slice(0, 60))
        : [],
      thumbnail: thumbnailUrl(v),
    }));
}

type Failure = Exclude<YouTubeTrends['status'], 'ok'>;

/** One Data API call; the parsed body, or why it failed. */
async function getJson(url: string): Promise<{ data: unknown } | { failure: Failure }> {
  let response: Response;
  let data: unknown = null;
  try {
    response = await fetch(url, {
      // Cached in memory by the callers, so a quota error is never kept for an hour
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    data = await response.json();
  } catch {
    return { failure: 'error' };
  }

  if (!response.ok) {
    const reason = (data as { error?: { errors?: { reason?: string }[] } } | null)?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return { failure: 'quota' };
    console.error('YouTube API error', response.status, reason);
    return { failure: response.status === 400 || response.status === 403 ? 'not_configured' : 'error' };
  }
  return { data };
}

// Parts don't change the cost: still 1 unit
const videoParts = 'snippet,statistics,contentDetails';

async function request(regionCode: string, maxResults: number, categoryId?: string): Promise<YouTubeTrends> {
  const failed = (status: Failure): YouTubeTrends => ({ status, regionCode, categoryId, videos: [] });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return failed('not_configured');

  const result = await getJson(
    `${ENDPOINT}?${new URLSearchParams({
      part: videoParts,
      chart: 'mostPopular',
      regionCode,
      maxResults: String(maxResults),
      ...(categoryId && { videoCategoryId: categoryId }),
      key,
    })}`,
  );
  if ('failure' in result) return failed(result.failure);

  const videos = parseVideos(result.data);
  if (!videos) return failed('error');
  return { status: 'ok', regionCode, categoryId, videos };
}

/**
 * The most-viewed videos for a search published since `publishedAfter`,
 * with full statistics. Costs 101 units (search.list 100 + videos.list 1),
 * so callers store the result instead of searching again. `query` takes
 * YouTube's OR syntax ("skincare|makeup"). Never throws.
 */
export async function searchYouTubeVideos(
  query: string,
  { regionCode = 'ID', publishedAfter, maxResults = 25 }: { regionCode?: string; publishedAfter: string; maxResults?: number },
): Promise<YouTubeTrends> {
  const failed = (status: Failure): YouTubeTrends => ({ status, regionCode, videos: [] });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return failed('not_configured');

  const search = await getJson(
    `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({
      part: 'id',
      type: 'video',
      order: 'viewCount',
      q: query,
      regionCode,
      relevanceLanguage: 'id',
      publishedAfter,
      maxResults: String(maxResults),
      key,
    })}`,
  );
  if ('failure' in search) return failed(search.failure);

  const items = (search.data as { items?: { id?: { videoId?: unknown } }[] } | null)?.items;
  const ids = Array.isArray(items) ? items.map((item) => item.id?.videoId).filter((id): id is string => typeof id === 'string') : [];
  if (!ids.length) return { status: 'ok', regionCode, videos: [] };

  const details = await getJson(`${ENDPOINT}?${new URLSearchParams({ part: videoParts, id: ids.join(','), key })}`);
  if ('failure' in details) return failed(details.failure);
  const videos = parseVideos(details.data);
  if (!videos) return failed('error');
  // videos.list doesn't keep the search order; most viewed first again
  return { status: 'ok', regionCode, videos: videos.sort((a, b) => b.viewCount - a.viewCount) };
}

/**
 * Top trending videos for a region, optionally within one video category.
 * Never throws; failures come back with a status.
 */
export async function fetchYouTubeTrends(regionCode = 'ID', maxResults = 3, categoryId?: string): Promise<YouTubeTrends> {
  const cacheKey = `${regionCode}:${maxResults}:${categoryId ?? 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.trends;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = request(regionCode, maxResults, categoryId)
    .then((trends) => {
      if (trends.status === 'ok') cache.set(cacheKey, { trends, expiresAt: Date.now() + CACHE_TTL_MS });
      return trends;
    })
    .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, promise);
  return promise;
}

/** "1. Title — Channel (134.527 views)" lines for the prompt and the copied brief. */
export function formatYouTubeTrends(trends: YouTubeTrends): string {
  if (trends.status !== 'ok' || trends.videos.length === 0) return 'Data tren YouTube tidak tersedia saat ini.';
  return trends.videos
    .map((v, i) => `${i + 1}. ${v.title} — ${v.channelTitle} (${v.viewCount.toLocaleString('id-ID')} views)`)
    .join('\n');
}
