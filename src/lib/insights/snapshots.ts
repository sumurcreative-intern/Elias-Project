import { daysBefore } from '../dates';
import { createAdminClient } from '../supabase/admin';
import type { YouTubeTrends, YouTubeVideo } from '../youtube';

// Daily YouTube chart snapshots
// (supabase/migrations/20261104100000_youtube_snapshots.sql). Today's charts
// are compared with the newest earlier day, so the cycle can say what is
// rising instead of only what is popular. Server only, through the secret key.

/** How far back a previous snapshot still counts as "the day before". */
const MAX_GAP_DAYS = 7;

export type ChartTrends = { chart: string; trends: YouTubeTrends };

/** One video measured against the previous snapshot. */
export type Movement = {
  /** Date of the snapshot compared against */
  since: string;
  /** Views gained since then; null when the video was not stored that day */
  viewGain: number | null;
  /** Positions climbed on this chart (negative: dropped); null when it was not on it */
  rankChange: number | null;
  /** Not on this chart in the previous snapshot */
  newOnChart: boolean;
};

type PreviousRow = { snapshot_date: string; chart: string; video_id: string; rank: number; view_count: number };

export type PreviousSnapshot = {
  date: string;
  /** video id → views, from whichever chart stored it */
  views: Map<string, number>;
  /** "chart:video id" → rank */
  ranks: Map<string, number>;
};

/** Saves today's charts once; a later run the same day keeps the first capture. */
export async function saveSnapshot(date: string, charts: ChartTrends[]): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const rows = charts.flatMap(({ chart, trends }) =>
    trends.status !== 'ok'
      ? []
      : trends.videos.map((video, i) => ({
          snapshot_date: date,
          chart,
          video_id: video.id,
          rank: i + 1,
          title: video.title,
          channel_title: video.channelTitle,
          view_count: video.viewCount,
          like_count: video.likeCount,
          comment_count: video.commentCount,
          published_at: video.publishedAt,
          duration: video.duration,
          tags: video.tags,
        })),
  );
  if (!rows.length) return;
  const { error } = await admin
    .from('youtube_chart_snapshots')
    .upsert(rows, { onConflict: 'snapshot_date,chart,video_id', ignoreDuplicates: true });
  if (error) console.error('YouTube snapshots: saving failed', error);
}

type StoredRow = {
  chart: string;
  video_id: string;
  title: string;
  channel_title: string;
  view_count: number;
  like_count: number | null;
  comment_count: number | null;
  published_at: string | null;
  duration: string | null;
  tags: string[];
};

/**
 * Charts already stored for `date`, in rank order, keyed by chart. Lets a
 * retried cycle reuse today's searches (101 quota units each) instead of
 * paying for them again.
 */
export async function readStoredCharts(date: string, charts: string[]): Promise<Map<string, YouTubeVideo[]>> {
  const stored = new Map<string, YouTubeVideo[]>();
  const admin = createAdminClient();
  if (!admin || !charts.length) return stored;
  const { data, error } = await admin
    .from('youtube_chart_snapshots')
    .select('chart, video_id, title, channel_title, view_count, like_count, comment_count, published_at, duration, tags')
    .eq('snapshot_date', date)
    .in('chart', charts)
    .order('rank', { ascending: true })
    .returns<StoredRow[]>();
  if (error) console.error('YouTube snapshots: reading failed', error);
  for (const row of data ?? []) {
    const videos = stored.get(row.chart) ?? [];
    videos.push({
      id: row.video_id,
      title: row.title,
      channelTitle: row.channel_title,
      viewCount: Number(row.view_count),
      likeCount: row.like_count === null ? null : Number(row.like_count),
      commentCount: row.comment_count === null ? null : Number(row.comment_count),
      publishedAt: row.published_at,
      duration: row.duration,
      tags: row.tags,
      thumbnail: `https://i.ytimg.com/vi/${row.video_id}/mqdefault.jpg`,
    });
    stored.set(row.chart, videos);
  }
  return stored;
}

/** The newest snapshot before `date` within a week, or null on the first days. */
export async function readPreviousSnapshot(date: string): Promise<PreviousSnapshot | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const latest = await admin
    .from('youtube_chart_snapshots')
    .select('snapshot_date')
    .lt('snapshot_date', date)
    .gte('snapshot_date', daysBefore(date, MAX_GAP_DAYS))
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle<{ snapshot_date: string }>();
  if (latest.error) console.error('YouTube snapshots: reading failed', latest.error);
  if (!latest.data) return null;

  const since = latest.data.snapshot_date;
  const { data, error } = await admin
    .from('youtube_chart_snapshots')
    .select('snapshot_date, chart, video_id, rank, view_count')
    .eq('snapshot_date', since)
    .returns<PreviousRow[]>();
  if (error || !data?.length) {
    if (error) console.error('YouTube snapshots: reading failed', error);
    return null;
  }
  return {
    date: since,
    views: new Map(data.map((row) => [row.video_id, Number(row.view_count)])),
    ranks: new Map(data.map((row) => [`${row.chart}:${row.video_id}`, row.rank])),
  };
}

export function movementFor(
  previous: PreviousSnapshot,
  chart: string,
  videoId: string,
  rank: number,
  viewCount: number,
): Movement {
  const before = previous.views.get(videoId);
  const lastRank = previous.ranks.get(`${chart}:${videoId}`);
  return {
    since: previous.date,
    // A view count never drops for real; a smaller one is a recount, not news
    viewGain: before === undefined ? null : Math.max(0, viewCount - before),
    rankChange: lastRank === undefined ? null : lastRank - rank,
    newOnChart: lastRank === undefined,
  };
}
