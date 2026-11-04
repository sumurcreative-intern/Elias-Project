// Google Trends "Trending now" for a country, from Google's public RSS feed.
// Server only.
//
// As checked on 4 Nov 2026: the feed lists the 10 newest trending searches
// (about two hours' worth), each with a coarse traffic level ("1000+"), the
// time it started and up to 3 related news articles. It has no categories and
// no history, and accepts no parameters besides geo. The google-trends-api
// npm package is no help: its dailytrends endpoint now answers 404. Google
// doesn't guarantee the feed, so a failure never fails the cycle.

const ENDPOINT = 'https://trends.google.com/trending/rss';
const CACHE_TTL_MS = 3_600_000;
const MAX_NEWS = 3;

export type SearchNews = { title: string; url: string; source: string };

export type SearchTrend = {
  /** The search as Google lists it, lowercase */
  term: string;
  /** Lower bound of Google's traffic level: 1000 for "1000+" */
  approxTraffic: number;
  /** When the search started trending (ISO), null when the feed left it out */
  startedAt: string | null;
  news: SearchNews[];
};

export type SearchTrends =
  | { status: 'ok'; trends: SearchTrend[] }
  | { status: 'error'; trends: [] };

// Successful answers only, per region
const cache = new Map<string, { trends: SearchTrends; expiresAt: number }>();

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(text: string): string {
  return text
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
      if (name[0] !== '#') return entities[name.toLowerCase()] ?? match;
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Text of the first <tag> in `xml`, or null when it is missing or empty. */
function tagText(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  const text = match ? decode(match[1]) : '';
  return text || null;
}

/** "1000+" → 1000, "2K+" → 2000; 0 when unreadable. */
export function parseTraffic(label: string | null): number {
  const m = label?.replace(/[.,\s]/g, '').match(/^(\d+)([KM]?)\+?$/i);
  if (!m) return 0;
  return Number(m[1]) * ({ k: 1_000, m: 1_000_000 }[m[2].toLowerCase()] ?? 1);
}

export function parseFeed(xml: string): SearchTrend[] | null {
  if (!xml.includes('<rss')) return null;
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.flatMap((item) => {
    const term = tagText(item, 'title')?.toLowerCase();
    if (!term) return [];
    const started = Date.parse(tagText(item, 'pubDate') ?? '');
    const news = (item.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/g) ?? [])
      .map((block) => ({
        title: tagText(block, 'ht:news_item_title') ?? '',
        url: tagText(block, 'ht:news_item_url') ?? '',
        source: tagText(block, 'ht:news_item_source') ?? '',
      }))
      // Rendered as links, so only plain web URLs get through
      .filter((article) => article.title && /^https?:\/\//i.test(article.url))
      .slice(0, MAX_NEWS)
      .map((article) => ({ ...article, title: article.title.slice(0, 200) }));
    return [
      {
        term: term.slice(0, 100),
        approxTraffic: parseTraffic(tagText(item, 'ht:approx_traffic')),
        startedAt: Number.isNaN(started) ? null : new Date(started).toISOString(),
        news,
      },
    ];
  });
}

/** Today's newest trending searches for a region. Never throws. */
export async function fetchSearchTrends(geo = 'ID'): Promise<SearchTrends> {
  const cached = cache.get(geo);
  if (cached && cached.expiresAt > Date.now()) return cached.trends;

  let xml: string;
  try {
    const response = await fetch(`${ENDPOINT}?${new URLSearchParams({ geo })}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error('Google Trends RSS returned', response.status);
      return { status: 'error', trends: [] };
    }
    xml = await response.text();
  } catch (error) {
    console.error('Google Trends RSS failed', error);
    return { status: 'error', trends: [] };
  }

  const parsed = parseFeed(xml);
  if (!parsed) {
    console.error('Google Trends RSS was not a feed', xml.slice(0, 200));
    return { status: 'error', trends: [] };
  }
  const trends: SearchTrends = { status: 'ok', trends: parsed };
  cache.set(geo, { trends, expiresAt: Date.now() + CACHE_TTL_MS });
  return trends;
}
