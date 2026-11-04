-- Onboarding "Peran" now asks for one of the PRD's seven creative roles
-- instead of a job title, so the role shown on Beranda is the one picked.
-- Saved job titles move to the role Elias already tailored them to;
-- anything else falls back to strategist, the same default as before.
update public.profiles
set role = case role
  when 'founder' then 'strategist'
  when 'brand_manager' then 'strategist'
  when 'brand_strategist' then 'strategist'
  when 'marketing_manager' then 'content_planner'
  when 'social_media_specialist' then 'content_planner'
  when 'copywriter' then 'content_writer'
  when 'public_relations' then 'content_writer'
  when 'agency_account_manager' then 'creative_director'
  when 'creative_director' then 'creative_director'
  when 'content_creator' then 'content_creator'
  else 'strategist'
end
where role is not null and role not in (
  'content_planner', 'graphic_designer', 'creative_director', 'art_director',
  'content_writer', 'strategist', 'content_creator'
);

alter table public.profiles
  add constraint profiles_role_creative_check check (role in (
    'content_planner', 'graphic_designer', 'creative_director', 'art_director',
    'content_writer', 'strategist', 'content_creator'
  ));
