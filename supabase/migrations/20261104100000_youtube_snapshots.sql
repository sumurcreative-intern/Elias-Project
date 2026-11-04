-- Daily snapshot of the YouTube Indonesia trending charts. The generator in
-- src/lib/insights/live.ts saves each chart once per day (WIB) with the secret
-- key; the next day's cycle compares against it to tell what is rising: views
-- gained, rank moved, new on the chart. Server only: no read policy.
-- Kept for 30 days, then deleted every night by pg_cron.

create table public.youtube_chart_snapshots (
  snapshot_date date not null,
  -- 'all' for the general chart, otherwise the YouTube video category id
  chart text not null,
  video_id text not null,
  -- 1-based position on that chart
  rank smallint not null check (rank > 0),
  title text not null,
  channel_title text not null default '',
  view_count bigint not null default 0,
  like_count bigint,
  comment_count bigint,
  published_at timestamptz,
  -- ISO 8601 duration ("PT58S"), tells Shorts from long videos
  duration text,
  tags text[] not null default '{}',
  captured_at timestamptz not null default now(),
  primary key (snapshot_date, chart, video_id)
);

create index youtube_chart_snapshots_video_idx on public.youtube_chart_snapshots (video_id, snapshot_date desc);

comment on table public.youtube_chart_snapshots is 'Daily YouTube Indonesia chart snapshots; kept for 30 days, then deleted by the purge-old-youtube-snapshots cron job.';

alter table public.youtube_chart_snapshots enable row level security;
revoke all on public.youtube_chart_snapshots from anon, authenticated;

-- 00:10 WIB every day
select cron.schedule(
  'purge-old-youtube-snapshots',
  '10 17 * * *',
  $$delete from public.youtube_chart_snapshots
    where snapshot_date < (now() at time zone 'Asia/Jakarta')::date - 30$$
);
