-- Shared state for POST /api/elias/insight, so every server instance sees the
-- same cache and the same per-user daily budget. Until now both lived in one
-- process's memory (src/lib/elias/cache.ts). Only the server touches these
-- tables, with the secret key; clients get no access at all.

-- One answer per cache key (brand id + role + trend + keyword), valid until
-- midnight WIB. The key embeds the caller's brand id, so a row is never
-- served to another account (DM-6).
create table public.elias_insight_cache (
  key text primary key,
  -- { insight, model, news, youtube }
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index elias_insight_cache_expires_at_idx on public.elias_insight_cache (expires_at);

-- Fresh (uncached) generations per user per WIB day, capped by
-- ELIAS_USER_DAILY_LIMIT so one account cannot spend the shared free quota.
create table public.elias_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, usage_date)
);

comment on table public.elias_insight_cache is 'Elias insight answers shared across server instances; expires at midnight WIB.';
comment on table public.elias_usage is 'Per-user daily count of fresh Elias generations; old days purged nightly.';

alter table public.elias_insight_cache enable row level security;
alter table public.elias_usage enable row level security;
revoke all on public.elias_insight_cache from anon, authenticated;
revoke all on public.elias_usage from anon, authenticated;

-- Counts one generation in a single statement, so two instances racing on the
-- same user cannot both take the last unit. Returns the new count, or null
-- once the user is at the limit.
create function public.take_elias_budget(p_user_id uuid, p_limit integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.elias_usage as u (user_id, usage_date, count)
  values (p_user_id, (now() at time zone 'Asia/Jakarta')::date, 1)
  on conflict (user_id, usage_date) do update
    set count = u.count + 1
    where u.count < p_limit
  returning count;
$$;

-- Gives a unit back on the day it was taken, when the upstream call never
-- reached a model
create function public.refund_elias_budget(p_user_id uuid, p_usage_date date)
returns void
language sql
set search_path = ''
as $$
  update public.elias_usage
    set count = count - 1
    where user_id = p_user_id and usage_date = p_usage_date and count > 0;
$$;

revoke execute on function public.take_elias_budget(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_elias_budget(uuid, date) from public, anon, authenticated;
grant execute on function public.take_elias_budget(uuid, integer) to service_role;
grant execute on function public.refund_elias_budget(uuid, date) to service_role;

-- 00:10 WIB: drop expired answers and past days' counters
select cron.schedule(
  'purge-elias-insight-cache',
  '10 17 * * *',
  $$
    delete from public.elias_insight_cache where expires_at <= now();
    delete from public.elias_usage where usage_date < (now() at time zone 'Asia/Jakarta')::date;
  $$
);
