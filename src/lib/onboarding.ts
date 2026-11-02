/** Columns needed to tell how far a user got through onboarding. */
export const onboardingColumns =
  'name, role, category, target_market, archetype, location, local_focus, goals, notification_time, onboarding_completed_at';

export type OnboardingProgress = {
  name: string | null;
  role: string | null;
  category: string | null;
  target_market: string | null;
  archetype: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
  notification_time: string | null;
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
  if (!profileDone) return '/onboarding/profile';
  const goalsDone = profile.goals.length > 0 && profile.notification_time;
  return goalsDone ? '/onboarding/survey' : '/onboarding/goals';
}

/** Onboarding pages in order; earlier ones stay reachable through their back links. */
export const onboardingSteps = ['/onboarding/profile', '/onboarding/goals', '/onboarding/survey'];
