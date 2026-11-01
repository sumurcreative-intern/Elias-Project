-- The signup "Tipe Akun" choices are now Personal / Agency (Figma Dropdown).
update public.profiles set account_type = 'agency' where account_type = 'brand';

alter table public.profiles drop constraint profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check check (account_type in ('personal', 'agency'));
