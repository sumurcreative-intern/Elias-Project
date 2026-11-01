-- Onboarding step 1 "Target Market": the audience the brand wants to reach,
-- used to tune the dashboard. Nullable so profiles that finished onboarding
-- before this question existed stay valid.
alter table public.profiles
  add column target_market text check (target_market in (
    'gen_z', 'millennials', 'gen_x', 'students', 'young_professionals',
    'parents', 'smb', 'enterprise', 'general'
  ));
