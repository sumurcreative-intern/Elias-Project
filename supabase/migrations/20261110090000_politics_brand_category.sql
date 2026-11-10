-- Adds "politics" to the brand industries picked at onboarding
-- (src/lib/brandCategories.ts).
alter table public.profiles drop constraint profiles_category_check;

alter table public.profiles
  add constraint profiles_category_check check (category in (
    'beauty', 'fashion', 'food_beverage', 'health_wellness', 'sports', 'arts',
    'entertainment', 'technology', 'education', 'travel', 'home_living',
    'automotive', 'finance', 'parenting', 'politics'
  ));
