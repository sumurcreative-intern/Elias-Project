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
  always_on: string;
};

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, category, archetype, target_market, location, local_focus, goals, notification_time, always_on')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  // A failed read renders the guest feed, so say why (e.g. a column whose migration isn't applied)
  if (error) console.error('Profile could not be read', error);
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
