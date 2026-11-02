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
  snippet?: { title?: unknown; channelTitle?: unknown; thumbnails?: { medium?: { url?: unknown }; default?: { url?: unknown } } };
  statistics?: { viewCount?: unknown };
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
      thumbnail: thumbnailUrl(v),
    }));
}

async function request(regionCode: string, maxResults: number, categoryId?: string): Promise<YouTubeTrends> {
  const failed = (status: YouTubeTrends['status']): YouTubeTrends => ({ status, regionCode, categoryId, videos: [] });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return failed('not_configured');

  const url = `${ENDPOINT}?${new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: String(maxResults),
    ...(categoryId && { videoCategoryId: categoryId }),
    key,
  })}`;

  let response: Response;
  let data: unknown = null;
  try {
    response = await fetch(url, {
      // Cached in memory below, so a quota error is never kept for an hour
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    data = await response.json();
  } catch {
    return failed('error');
  }

  if (!response.ok) {
    const reason = (data as { error?: { errors?: { reason?: string }[] } } | null)?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return failed('quota');
    console.error('YouTube API error', response.status, reason);
    return failed(response.status === 400 || response.status === 403 ? 'not_configured' : 'error');
  }

  const videos = parseVideos(data);
  if (!videos) return failed('error');
  return { status: 'ok', regionCode, categoryId, videos };
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
