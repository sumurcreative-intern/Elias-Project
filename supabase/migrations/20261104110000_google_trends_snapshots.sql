-- Searches trending on Google in Indonesia, from the public RSS feed
-- (src/lib/googleTrends.ts). The feed only lists the ~10 newest searches,
-- about two hours' worth, so the app captures it at most once an hour and
-- merges each capture into one row per term per day (WIB): the highest
-- traffic level seen, when it was first and last seen, and its newest news.
-- Server only: no read policy. Kept for 30 days, then deleted by pg_cron.

create table public.google_trends_snapshots (
  snapshot_date date not null,
  -- Lowercased search term as Google lists it
  term text not null,
  -- Lower bound of Google's traffic level: 1000 for "1000+"
  approx_traffic integer not null default 0 check (approx_traffic >= 0),
  -- When Google says the search started trending
  started_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- [{ "title", "url", "source" }], up to 3 related articles from the feed
  news jsonb not null default '[]',
  primary key (snapshot_date, term)
);

create index google_trends_snapshots_term_idx on public.google_trends_snapshots (term, snapshot_date desc);

comment on table public.google_trends_snapshots is 'Google Trends Indonesia RSS captures, one row per term per WIB day; kept for 30 days, then deleted by the purge-old-google-trends cron job.';

alter table public.google_trends_snapshots enable row level security;
revoke all on public.google_trends_snapshots from anon, authenticated;

-- 00:15 WIB every day
select cron.schedule(
  'purge-old-google-trends',
  '15 17 * * *',
  $$delete from public.google_trends_snapshots
    where snapshot_date < (now() at time zone 'Asia/Jakarta')::date - 30$$
);
