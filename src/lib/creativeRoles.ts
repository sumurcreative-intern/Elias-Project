// The seven creative roles from the PRD (Ch. 3). Each needs a different
// "so what" from the same insight, so recommendations are keyed by these.
export type CreativeRole =
  | 'content_planner'
  | 'graphic_designer'
  | 'creative_director'
  | 'art_director'
  | 'content_writer'
  | 'strategist'
  | 'content_creator';

export const creativeRoleLabels: Record<CreativeRole, string> = {
  content_planner: 'Content Planner',
  graphic_designer: 'Graphic Designer',
  creative_director: 'Creative Director',
  art_director: 'Art Director',
  content_writer: 'Content Writer',
  strategist: 'Strategist',
  content_creator: 'Content Creator',
};

/** The role saved in the profile; strategist when it is missing. */
export function creativeRoleFor(profileRole: string | null | undefined): CreativeRole {
  return isCreativeRole(profileRole) ? profileRole : 'strategist';
}

/** The "so what" each role needs from the same signal (PRD Ch. 3). Drives the AI prompt. */
export const creativeRoleFocus: Record<CreativeRole, string> = {
  content_planner: 'release timing and posting schedule: when to post and how long the trend stays usable',
  graphic_designer: 'the visual layer: palette, typography, motif, composition cues',
  creative_director: 'the story angle and a pitchable narrative that justifies budget and client buy-in',
  art_director: 'visual direction and mood: palette, typography, transition cues, not just decoration',
  content_writer: 'the hook, headline angle and CTA logic',
  strategist: 'market positioning and trend longevity: a three-day cycle or a lasting shift',
  content_creator: 'the fastest format they can shoot or make today',
};

export function isCreativeRole(value: unknown): value is CreativeRole {
  return typeof value === 'string' && Object.hasOwn(creativeRoleLabels, value);
}
