import type { Verdict } from '../insights/types';
import { executionFormats, type CopySuggestion, type EliasInsight, type ExecutionFormat } from './types';

// Small models sometimes answer with the Indonesian label or a capital letter
const verdictAliases: Record<string, Verdict> = {
  act: 'act',
  watch: 'watch',
  skip: 'skip',
  eksekusi: 'act',
  pantau: 'watch',
  lewati: 'skip',
};

/**
 * Enforces V3 on whatever the model wrote: no emoji, no exclamation marks.
 * Cheaper and more reliable than hoping a free model follows the prompt.
 */
export function cleanCopy(text: string, maxLength = 600): string {
  return text
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/!+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** "act", "Eksekusi", " SKIP " → a verdict; undefined for anything else. */
export function parseVerdict(value: unknown): Verdict | undefined {
  return typeof value === 'string' ? verdictAliases[value.trim().toLowerCase()] : undefined;
}

/** Pulls the JSON object out of a reply that may be fenced or wrapped in prose. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** The copy block when every part is filled; a missing one never fails the whole call. */
function parseCopy(value: unknown): CopySuggestion | undefined {
  if (!isRecord(value)) return undefined;
  const { hook, caption, cta } = value;
  if (!nonEmpty(hook) || !nonEmpty(caption) || !nonEmpty(cta)) return undefined;
  return { hook: cleanCopy(hook, 200), caption: cleanCopy(caption, 500), cta: cleanCopy(cta, 120) };
}

/** Validates and cleans a model reply; null when it doesn't match the contract. */
export function parseInsight(text: string): EliasInsight | null {
  const data = extractJson(text);
  if (!isRecord(data) || !isRecord(data.action)) return null;
  const { headline, soWhat, why, action } = data;
  const decision = parseVerdict(data.decision);
  if (!decision) return null;
  const skip = decision === 'skip';
  if (!nonEmpty(headline) || !nonEmpty(soWhat) || !nonEmpty(why)) return null;
  // A skip has nothing to execute, so it may come without an angle
  if (!skip && !nonEmpty(action.angle)) return null;

  const format: ExecutionFormat =
    typeof action.format === 'string' && (executionFormats as readonly string[]).includes(action.format)
      ? (action.format as ExecutionFormat)
      : 'none';
  const steps = Array.isArray(action.steps) ? action.steps.filter(nonEmpty).slice(0, 4).map((step) => cleanCopy(step, 240)) : [];

  const copy = skip ? undefined : parseCopy(data.copy);

  // A skip never carries an execution plan, whatever the model sent
  return {
    decision,
    headline: cleanCopy(headline, 240),
    soWhat: cleanCopy(soWhat),
    action: { format: skip ? 'none' : format, angle: nonEmpty(action.angle) ? cleanCopy(action.angle, 300) : '', steps: skip ? [] : steps },
    ...(copy && { copy }),
    why: cleanCopy(why, 240),
  };
}
