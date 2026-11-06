import { brandCategoryLabels, type BrandCategory } from '../brandCategories';
import { fetchYouTubeTrends, type YouTubeVideo } from '../youtube';
import { captureSearchTrends, storedSearchTrends, type CapturedSearch } from './searchTrends';
import { readStoredCharts } from './snapshots';
import { topicsOf } from './topics';
import { searchChart } from './youtubeSearch';

// "Lagi ramai hari ini" on Beranda: what the stored captures already show,
// with no model call. Searches come from the Google Trends captures
// (./searchTrends), topics are counted in code (./topics) across today's
// stored YouTube charts and searches (./snapshots). Server only.
//
// The brand refresh reads the same sources narrowed to one brand category:
// the YouTube charts for its video categories, fetched live (1 quota unit
// each, cached an hour and shared with the daily cycle), plus today's stored
// category search (./youtubeSearch; a fresh one would cost 101 units a press).
// Google's searches can't be split by category without a model, so they are
// only refreshed.

const MAX_SEARCHES = 8;
const MAX_TOPICS = 8;
// Searches are captured at most once an hour, so a page view rarely needs a fresh read
const CACHE_MS = 15 * 60_000;
// A refresh may capture Google's feed sooner than the hourly capture, but not on every press
const REFRESH_CAPTURE_MS = 10 * 60_000;
const REGION = 'ID';
// Same size as the cycle's charts, so both share fetchYouTubeTrends' cache
const CHART_SIZE = 50;

// YouTube video categories with a chart in Indonesia (checked on 4 Nov 2026,
// see ./live) where each brand industry's content shows up. Parenting has
// none: its videos are mostly made for children
const brandCharts: Record<BrandCategory, string[]> = {
  beauty: ['26'],
  fashion: ['26'],
  food_beverage: ['26'],
  health_wellness: ['26', '17'],
  sports: ['17'],
  arts: ['10', '1'],
  entertainment: ['24', '23', '1'],
  technology: ['28', '20'],
  education: ['28'],
  travel: [],
  home_living: ['26'],
  automotive: ['2'],
  finance: ['25'],
  parenting: [],
};

export type TrendingSearch = {
  term: string;
  /** Lower bound of Google's traffic level, 0 when unknown */
  approxTraffic: number;
  daysInRow: number;
  url: string;
};

export type TrendingTopic = {
  term: string;
  videos: number;
  channels: number;
  url: string;
};

export type Trending = {
  date: string;
  searches: TrendingSearch[];
  topics: TrendingTopic[];
  /** The brand category label when narrowed to one ("Beauty"), else absent */
  brand?: string;
  /** When this was read, ISO */
  readAt: string;
};

function toSearches(searches: CapturedSearch[]): TrendingSearch[] {
  return searches.slice(0, MAX_SEARCHES).map((search) => ({
    term: search.term,
    approxTraffic: search.approxTraffic,
    daysInRow: search.daysInRow,
    url: `https://trends.google.com/trends/explore?${new URLSearchParams({ geo: REGION, date: 'now 7-d', q: search.term })}`,
  }));
}

function toTopics(videos: YouTubeVideo[]): TrendingTopic[] {
  // The same video often sits on several charts: count it once
  const unique = new Map(videos.map((video) => [video.id, video]));
  return topicsOf([...unique.values()].map((video) => ({ video, viewGain: null })))
    .slice(0, MAX_TOPICS)
    .map((topic) => ({
      term: topic.term,
      videos: topic.videoIds.length,
      channels: topic.channels,
      url: `https://www.youtube.com/results?${new URLSearchParams({ search_query: topic.term })}`,
    }));
}

// On globalThis so dev-server reloads keep it
const store = globalThis as typeof globalThis & { eliasTrending?: { value: Trending; expiresAt: number } };

/** Today's trending searches and YouTube topics, cached for a few minutes. */
export async function getTrending(date: string): Promise<Trending> {
  const cached = store.eliasTrending;
  if (cached?.value.date === date && Date.now() < cached.expiresAt) return cached.value;
  const [searches, charts] = await Promise.all([storedSearchTrends(date), readStoredCharts(date)]);
  const value: Trending = {
    date,
    searches: toSearches(searches),
    topics: toTopics([...charts.values()].flat()),
    readAt: new Date().toISOString(),
  };
  // An empty read (no secret key, or nothing stored yet) is retried on the next view
  if (value.searches.length || value.topics.length) store.eliasTrending = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

/** The latest searches and the topics of one brand category's charts and search. */
export async function getBrandTrending(date: string, category: BrandCategory): Promise<Trending> {
  await captureSearchTrends(date, REFRESH_CAPTURE_MS);
  const [searches, stored, ...charts] = await Promise.all([
    storedSearchTrends(date),
    readStoredCharts(date, [searchChart(category)]),
    ...brandCharts[category].map((categoryId) => fetchYouTubeTrends(REGION, CHART_SIZE, categoryId)),
  ]);
  const videos = [
    ...charts.flatMap((chart) => (chart.status === 'ok' ? chart.videos : [])),
    ...(stored.get(searchChart(category)) ?? []),
  ];
  return {
    date,
    searches: toSearches(searches),
    topics: toTopics(videos),
    brand: brandCategoryLabels[category],
    readAt: new Date().toISOString(),
  };
}
