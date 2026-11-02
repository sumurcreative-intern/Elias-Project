-- The free-text check rejected every source except "other": with no free-text
-- answer, `null and false` is false, which fails a check. An empty answer is
-- now always allowed.
alter table public.profiles drop constraint profiles_check;
alter table public.profiles
  add constraint profiles_referral_source_other_check check (
    referral_source_other is null
    or (char_length(referral_source_other) <= 200 and referral_source = 'other')
  );
