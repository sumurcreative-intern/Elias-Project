-- Account data entered across signup and onboarding. Email, password, the
-- recovery code and the new password are handled by Supabase Auth (auth.users),
-- so none of them are stored here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Signup: "Tipe Akun"
  account_type text check (account_type in ('personal', 'brand')),

  -- Onboarding step 1: "Lengkapi Profil"
  name text check (char_length(trim(name)) > 0),
  role text check (char_length(trim(role)) > 0),
  category text check (category in ('personal', 'brand', 'agency')),
  archetype text check (archetype in (
    'innocent', 'explorer', 'sage', 'hero', 'outlaw', 'magician',
    'everyman', 'lover', 'jester', 'caregiver', 'creator', 'ruler'
  )),
  location text,
  local_focus boolean not null default false,

  -- Onboarding step 2: "Tujuan & Preferensi". Goals keep selection order:
  -- goals[1] is the top priority.
  goals text[] not null default '{}' check (cardinality(goals) <= 6),
  -- Morning email time, in WIB (Asia/Jakarta)
  notification_time time check (notification_time between '05:00' and '09:00'),

  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mirrors the forms' canSubmit rules once onboarding is finished
  constraint onboarding_complete check (
    onboarding_completed_at is null or (
      name is not null
      and role is not null
      and category is not null
      and archetype is not null
      and (location is not null or local_focus)
      and cardinality(goals) > 0
      and notification_time is not null
    )
  )
);

comment on table public.profiles is 'One row per user: signup account type plus onboarding answers.';

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Rows are created by the trigger below, never directly by clients
revoke insert, delete on public.profiles from anon, authenticated;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile on signup. The signup form passes account_type through
-- supabase.auth.signUp({ options: { data: { account_type } } }); social sign-in
-- leaves it null.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, account_type)
  values (new.id, nullif(new.raw_user_meta_data ->> 'account_type', ''));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
