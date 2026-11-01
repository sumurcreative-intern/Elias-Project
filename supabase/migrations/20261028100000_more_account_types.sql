-- The signup "Tipe Akun" dropdown gains Freelancer, Brand / Bisnis, Studio and
-- Organisasi / Komunitas next to Personal and Agency. Existing values stay valid.
alter table public.profiles drop constraint profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check check (account_type in (
    'personal', 'freelancer', 'brand', 'agency', 'studio', 'organization'
  ));
