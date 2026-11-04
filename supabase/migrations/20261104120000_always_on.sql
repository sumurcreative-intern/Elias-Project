-- "Always On" (PR-5): when the morning email goes out. Defaults to sending
-- only when there is something significant (V6), so existing users keep that
-- behaviour without answering again. Keep in sync with src/lib/alwaysOn.ts.
alter table public.profiles
  add column always_on text not null default 'significant'
    constraint profiles_always_on_check check (always_on in ('significant', 'daily'));

-- goals[1] stays the single primary goal (PR-2); the onboarding form moves a
-- promoted goal to the front, so no separate column is needed.
comment on column public.profiles.goals is 'Selected goals; goals[1] is the one primary goal.';
