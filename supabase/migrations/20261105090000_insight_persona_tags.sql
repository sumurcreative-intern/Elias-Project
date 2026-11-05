-- Persona tags the daily cycle writes on each card, so Beranda can open on
-- the cards for the user's brand and order them by its target market.
-- An empty array is an answer (no fit); null marks a card stored before
-- tagging, which Beranda matches on its category and leaves unranked.

-- profiles.category ids the trend has a real brand angle for
alter table public.insights add column brand_categories text[];
-- profiles.target_market ids the trend reaches ("general" is never a tag)
alter table public.insights add column audiences text[];

comment on column public.insights.brand_categories is 'profiles.category ids the trend fits; null on cards stored before tagging.';
comment on column public.insights.audiences is 'profiles.target_market ids the trend reaches; null on cards stored before tagging.';
