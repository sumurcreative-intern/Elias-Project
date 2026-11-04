import { searchYouTubeVideos, type YouTubeTrends, type YouTubeVideo } from '../youtube';
import { readStoredCharts, type ChartTrends } from './snapshots';

// Per brand category YouTube searches: what Indonesian creators published in
// the last 48 hours, most viewed first. The trending charts only show what is
// big; these find what is happening inside a niche. Server only.
//
// Quota: 101 units a search, 11 searches = 1,111 of the 10,000 daily units.
// Each search runs once per WIB day: its result is stored with the chart
// snapshots and reused by any retry.
//
// regionCode and relevanceLanguage don't keep results Indonesian: English
// terms ("skincare|makeup") and YouTube topic ids return global videos, and
// broad Indonesian words ("kulit", "wajah", "cantik") match unrelated ones.
// So the queries use specific Indonesian phrases, and results without
// Indonesian words are dropped. Tested on 4 Nov 2026; Sports (charts cover
// it, the query found almost nothing), Arts and Parenting (mostly kids'
// content and accidents) are left out until better queries are found.

const WINDOW_HOURS = 48;
const RESULTS = 50;

export const categorySearches: { category: string; label: string; query: string }[] = [
  {
    category: 'beauty',
    label: 'Beauty',
    query: '"skincare lokal"|"review skincare"|"rekomendasi skincare"|"tutorial makeup"|"makeup lokal"|"cushion lokal"',
  },
  {
    category: 'fashion',
    label: 'Fashion',
    query: '"outfit hijab"|"ootd hijab"|"haul shopee"|"mix and match"|"baju lebaran"|"outfit kondangan"',
  },
  { category: 'food_beverage', label: 'Food & Beverage', query: 'resep|masak|jajanan|kuliner' },
  {
    category: 'health_wellness',
    label: 'Health & Wellness',
    query: '"tips sehat"|"gaya hidup sehat"|"tips diet"|"olahraga rumah"|"kata dokter"',
  },
  { category: 'entertainment', label: 'Entertainment', query: 'sinetron|"film indonesia"|"podcast indonesia"|"drama indonesia"' },
  { category: 'technology', label: 'Technology', query: '"review hp"|"hp murah"|"hp terbaru"|"review laptop"|"tips android"' },
  { category: 'education', label: 'Education', query: '"tips belajar"|"cara belajar"|beasiswa|utbk|"belajar bahasa inggris"' },
  { category: 'travel', label: 'Travel', query: 'wisata|liburan|"jalan jalan"|staycation' },
  {
    category: 'home_living',
    label: 'Home & Living',
    query: '"rumah minimalis"|"dekorasi rumah"|"beres beres rumah"|"home tour"|"renovasi rumah"',
  },
  {
    category: 'automotive',
    label: 'Automotive',
    query: '"review mobil"|"motor baru"|"mobil listrik"|"modifikasi motor"|"harga mobil"',
  },
  { category: 'finance', label: 'Finance', query: 'investasi|saham|"cara menabung"|"bisnis sampingan"|"keuangan pribadi"' },
];

/** Snapshot chart key of a category search. */
export const searchChart = (category: string) => `search:${category}`;

// Function words and slang only Indonesian titles carry; one is enough
const indonesianWords =
  /(?:^|[^\p{L}])(yang|dan|ini|itu|aku|kamu|banget|gak|nggak|enggak|bikin|cara|murah|enak|buat|sama|lagi|udah|sih|dong|kok|terbaru|indonesia|lokal|di|ke|untuk|dengan|tips|resep|harga)(?=$|[^\p{L}])/iu;

function isIndonesian(video: YouTubeVideo): boolean {
  return indonesianWords.test(`${video.title} ${video.tags.join(' ')}`);
}

// Without the secret key nothing is stored, so today's results also stay in
// memory; on globalThis so dev-server reloads don't search again
const memory = globalThis as typeof globalThis & { eliasSearches?: { date: string; charts: Map<string, YouTubeVideo[]> } };

/**
 * Today's category searches as charts ("search:beauty"), Indonesian results
 * only, most viewed first. Reuses what is already stored for `date`.
 */
export async function categorySearchTrends(date: string, regionCode = 'ID'): Promise<ChartTrends[]> {
  if (memory.eliasSearches?.date !== date) memory.eliasSearches = { date, charts: new Map() };
  const known = memory.eliasSearches.charts;
  const keys = categorySearches.map((s) => searchChart(s.category));

  const stored = await readStoredCharts(
    date,
    keys.filter((key) => !known.has(key)),
  );
  stored.forEach((videos, key) => known.set(key, videos));

  const publishedAfter = new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString();
  return Promise.all(
    categorySearches.map(async ({ category, query }): Promise<ChartTrends> => {
      const chart = searchChart(category);
      const cached = known.get(chart);
      if (cached) return { chart, trends: { status: 'ok', regionCode, videos: cached } };

      const result: YouTubeTrends = await searchYouTubeVideos(query, { regionCode, publishedAfter, maxResults: RESULTS });
      if (result.status !== 'ok') return { chart, trends: result };
      const videos = result.videos.filter(isIndonesian);
      known.set(chart, videos);
      return { chart, trends: { ...result, videos } };
    }),
  );
}
