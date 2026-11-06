// Indonesian news and industry media from public RSS feeds, aggregated here.
// Server only.
//
// As checked on 6 Nov 2026: Antara, CNN Indonesia, detikNews, CNBC Indonesia,
// Republika and Tempo serve RSS 2.0 directly. Marketeers, MIX and SWA serve
// no feed to non-browsers, so they come through Google News' own aggregator
// (a `site:` search feed), whose links redirect through news.google.com.
// Kompas, Liputan6, Kumparan, Suara, IDN Times, Kontan and Bisnis answered no
// usable feed.
//
// None of this may hold the cycle up: every feed is fetched in parallel with
// its own timeout, a failed feed is skipped and the rest still count, and
// each answer is cached for an hour, so a feed is read at most once an hour.

const CACHE_TTL_MS = 3_600_000;
const TIMEOUT_MS = 8_000;
const USER_AGENT = 'web:elias-trends:0.1 (daily trend research for Indonesian creative teams)';
const MAX_LOCAL = 15;
const MAX_INDUSTRY = 12;
// Industry media publish less often than daily news
const LOCAL_WINDOW_MS = 24 * 3_600_000;
const INDUSTRY_WINDOW_MS = 48 * 3_600_000;

export type FeedKind = 'local' | 'industry';

type Feed = {
  /** Outlet name; Google News items name their own outlet instead */
  outlet: string;
  url: string;
  kind: FeedKind;
};

const googleNews = (query: string) =>
  `https://news.google.com/rss/search?${new URLSearchParams({ q: query, hl: 'id', gl: 'ID', ceid: 'ID:id' })}`;

const feeds: Feed[] = [
  { outlet: 'Antara', url: 'https://www.antaranews.com/rss/terkini.xml', kind: 'local' },
  { outlet: 'CNN Indonesia', url: 'https://www.cnnindonesia.com/nasional/rss', kind: 'local' },
  { outlet: 'detikNews', url: 'https://news.detik.com/rss', kind: 'local' },
  { outlet: 'CNBC Indonesia', url: 'https://www.cnbcindonesia.com/news/rss', kind: 'local' },
  { outlet: 'Republika', url: 'https://www.republika.co.id/rss', kind: 'local' },
  { outlet: 'Tempo', url: 'https://rss.tempo.co/nasional', kind: 'local' },
  { outlet: 'Google News', url: googleNews('site:marketeers.com OR site:mix.co.id OR site:swa.co.id when:2d'), kind: 'industry' },
  { outlet: 'CNBC Indonesia Tech', url: 'https://www.cnbcindonesia.com/tech/rss', kind: 'industry' },
  { outlet: 'CNBC Indonesia Lifestyle', url: 'https://www.cnbcindonesia.com/lifestyle/rss', kind: 'industry' },
  { outlet: 'DailySocial', url: 'https://dailysocial.id/feed', kind: 'industry' },
];

export type FeedArticle = {
  title: string;
  url: string;
  outlet: string;
  kind: FeedKind;
  publishedAt: string;
  /** Start of the feed's summary, often empty */
  summary: string;
};

export type MediaNews = {
  local: FeedArticle[];
  industry: FeedArticle[];
  /** Feeds that answered, out of all */
  answered: number;
  total: number;
};

const cache = new Map<string, { articles: FeedArticle[]; expiresAt: number }>();

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] !== '#') return entities[name.toLowerCase()] ?? match;
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

/** Plain text of the first <tag>: CDATA unwrapped, markup and links dropped. */
function text(xml: string, tag: string): string {
  const raw = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))?.[1] ?? '';
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Twice: some feeds escape their HTML, so tags only appear after the first decode
  const plain = decodeEntities(decodeEntities(unwrapped).replace(/<[^>]+>/g, ' ').replace(/<[^>]+>/g, ' '));
  // A link in the prompt could read as coverage of X or Instagram (BR-5)
  return plain.replace(/\b(?:https?:\/\/|www\.)\S+/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function parseFeed(xml: string, feed: Feed): FeedArticle[] | null {
  if (!/<rss[\s>]/.test(xml)) return null;
  return (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).flatMap((item) => {
    const url = decodeEntities(item.match(/<link>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/)?.[1] ?? '');
    const published = Date.parse(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] ?? '');
    let title = text(item, 'title');
    let outlet = feed.outlet;
    // Google News names the outlet in <source> and repeats it after the title
    const source = text(item, 'source');
    if (source) {
      outlet = source;
      if (title.endsWith(` - ${source}`)) title = title.slice(0, -source.length - 3);
    }
    // Rendered as links, so only plain web URLs get through
    if (!title || !/^https?:\/\//i.test(url) || Number.isNaN(published)) return [];
    const summary = source ? '' : text(item, 'description');
    return [
      {
        title: title.slice(0, 200),
        url,
        outlet: outlet.slice(0, 60),
        kind: feed.kind,
        publishedAt: new Date(published).toISOString(),
        summary: summary === title ? '' : summary.slice(0, 200),
      },
    ];
  });
}

/** Tempo still serves ISO-8859-15; everything else is UTF-8. */
function decodeBody(bytes: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder('utf-8').decode(bytes.slice(0, 200));
  const charset = (contentType?.match(/charset=([\w-]+)/i)?.[1] ?? head.match(/encoding="([\w-]+)"/i)?.[1] ?? 'utf-8').toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** One feed's articles, or null when it failed. Never throws. */
async function readFeed(feed: Feed): Promise<FeedArticle[] | null> {
  const hit = cache.get(feed.url);
  if (hit && hit.expiresAt > Date.now()) return hit.articles;
  try {
    const response = await fetch(feed.url, {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn('News feed returned', response.status, feed.outlet);
      return null;
    }
    const articles = parseFeed(decodeBody(await response.arrayBuffer(), response.headers.get('content-type')), feed);
    if (!articles) {
      console.warn('News feed was not RSS', feed.outlet);
      return null;
    }
    cache.set(feed.url, { articles, expiresAt: Date.now() + CACHE_TTL_MS });
    return articles;
  } catch (error) {
    console.warn('News feed failed', feed.outlet, error instanceof Error ? error.message : error);
    return null;
  }
}

const titleKey = (title: string) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Newest first, one outlet at a time in turn, so the busiest feed can't fill
 * the list; the same story from two outlets counts once.
 */
function pick(articles: FeedArticle[], max: number, windowMs: number): FeedArticle[] {
  const since = Date.now() - windowMs;
  const seen = new Set<string>();
  const byOutlet = new Map<string, FeedArticle[]>();
  for (const article of [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const key = titleKey(article.title);
    if (Date.parse(article.publishedAt) < since || seen.has(key)) continue;
    seen.add(key);
    byOutlet.set(article.outlet, [...(byOutlet.get(article.outlet) ?? []), article]);
  }
  const queues = [...byOutlet.values()];
  const picked: FeedArticle[] = [];
  for (let round = 0; picked.length < max && queues.some((queue) => queue.length > round); round++) {
    for (const queue of queues) if (queue[round] && picked.length < max) picked.push(queue[round]);
  }
  return picked;
}

/** The last day's local news and the last two days' industry media. Never throws. */
export async function fetchMediaNews(): Promise<MediaNews> {
  const results = await Promise.all(feeds.map(readFeed));
  const all = results.flatMap((articles) => articles ?? []);
  return {
    local: pick(all.filter((a) => a.kind === 'local'), MAX_LOCAL, LOCAL_WINDOW_MS),
    industry: pick(all.filter((a) => a.kind === 'industry'), MAX_INDUSTRY, INDUSTRY_WINDOW_MS),
    answered: results.filter(Boolean).length,
    total: feeds.length,
  };
}
