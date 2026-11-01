/** Columns needed to tell how far a user got through onboarding. */
export const onboardingColumns = 'name, role, category, target_market, archetype, location, local_focus, onboarding_completed_at';

export type OnboardingProgress = {
  name: string | null;
  role: string | null;
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
  onboarding_completed_at: string | null;
};

/** The onboarding page a user should be on, or null once onboarding is finished. */
export function nextOnboardingStep(profile: OnboardingProgress | null): string | null {
  if (profile?.onboarding_completed_at) return null;
  const profileDone =
    profile?.name &&
    profile.role &&
    profile.category &&
    profile.target_market &&
    profile.archetype &&
    (profile.location || profile.local_focus);
  return profileDone ? '/onboarding/goals' : '/onboarding/profile';
}
