import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandContext } from './types';

export type ProfileRow = {
  role: string | null;
  category: string | null;
  archetype: string | null;
  target_market: string | null;
  location: string | null;
  local_focus: boolean;
  goals: string[];
  notification_time: string | null;
};

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role, category, archetype, target_market, location, local_focus, goals, notification_time')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  return data;
}

/** Keyed to the user until brand_profile exists (DM-4, docs/MVP.md MVP 4). */
export function brandContextFor(userId: string, profile: ProfileRow): BrandContext {
  return {
    id: userId,
    category: profile.category,
    archetype: profile.archetype,
    targetMarket: profile.target_market,
    location: profile.location,
    localFocus: profile.local_focus,
    goals: profile.goals,
  };
}
