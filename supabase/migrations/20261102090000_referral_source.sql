-- Onboarding step 3 "Survei Singkat": where the user first heard about Elias.
-- Asked after "Tujuan & Preferensi", which no longer finishes onboarding on its
-- own. Nullable so profiles that finished onboarding before this question
-- existed stay valid; the form still requires an answer.
alter table public.profiles
  add column referral_source text check (referral_source in (
    'x_twitter', 'friend_colleague', 'instagram', 'facebook', 'ai_platform',
    'google', 'github', 'ads', 'linkedin', 'other'
  )),
  -- Free-text answer, only kept for "Lainnya / Tidak yakin"
  add column referral_source_other text check (
    char_length(referral_source_other) <= 200
    and referral_source = 'other'
  );
