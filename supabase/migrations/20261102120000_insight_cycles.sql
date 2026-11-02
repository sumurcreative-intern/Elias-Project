-- Beranda keeps the last 5 daily cycles (today and the 4 days before, WIB).
-- The generator in src/lib/insights/live.ts writes each day's cycle once with
-- the secret key; everyone, guests included, reads the cards inside the window.
-- Older cycles are deleted every night by pg_cron, and the read policy hides
-- them even if a nightly run is missed.

create function public.insight_window_start()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::date - 4;
$$;

-- One row per generated day. A day with no cards is a quiet day (V6), not a
-- missing one: its row stops the generator from running again that day.
create table public.insight_cycles (
  cycle_date date primary key,
  generated_at timestamptz not null default now()
);

create table public.insights (
  id text primary key,
  cycle_date date not null references public.insight_cycles (cycle_date) on delete cascade,
  -- Order the generator returned the cards in, within the day
  position smallint not null,
  source text not null check (source in ('google_trends', 'youtube', 'gdelt', 'reddit', 'x')),
  category text not null,
  tags text[] not null default '{}',
  observed_on date not null,
  signal text not null check (char_length(signal) > 0),
  lifecycle text,
  verdict text not null check (verdict in ('act', 'watch', 'skip')),
  why_it_matters text not null,
  -- { [creative role]: sentence }
  recommendations jsonb not null,
  -- [{ title, url, detail }]
  evidence jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index insights_cycle_date_idx on public.insights (cycle_date desc, position);

comment on table public.insight_cycles is 'Daily Beranda cycles; kept for 5 days, then deleted by the purge-old-insights cron job.';
comment on table public.insights is 'Beranda cards per daily cycle; deleted with their cycle after 5 days.';

alter table public.insight_cycles enable row level security;
alter table public.insights enable row level security;

create policy "Anyone can read cycles from the last 5 days"
  on public.insight_cycles for select
  to anon, authenticated
  using (cycle_date >= (select public.insight_window_start()));

create policy "Anyone can read cards from the last 5 days"
  on public.insights for select
  to anon, authenticated
  using (cycle_date >= (select public.insight_window_start()));

-- Only the server (secret key, which bypasses RLS) writes cycles
revoke insert, update, delete on public.insight_cycles from anon, authenticated;
revoke insert, update, delete on public.insights from anon, authenticated;

create extension if not exists pg_cron;

-- 00:05 WIB every day; deleting a cycle deletes its cards
select cron.schedule(
  'purge-old-insights',
  '5 17 * * *',
  $$delete from public.insight_cycles where cycle_date < public.insight_window_start()$$
);
