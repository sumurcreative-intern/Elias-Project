-- Onboarding "Kategori" now asks for the brand's industry instead of
-- Personal / Brand / Agency. Old answers have no equivalent, so those users
-- are sent back to the profile step to choose again.
alter table public.profiles drop constraint profiles_category_check;

update public.profiles
  set category = null, onboarding_completed_at = null
  where category in ('personal', 'brand', 'agency');

alter table public.profiles
  add constraint profiles_category_check check (category in (
    'beauty', 'fashion', 'food_beverage', 'health_wellness', 'sports', 'arts',
    'entertainment', 'technology', 'education', 'travel', 'home_living',
    'automotive', 'finance', 'parenting'
  ));
