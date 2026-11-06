import { creativeRoleLabels, type CreativeRole } from '../creativeRoles';
import type { NewsContext } from '../gdelt';
import type { Verdict } from '../insights/types';
import { formatYouTubeTrends, type YouTubeTrends } from '../youtube';
import { executionFormatLabels, type EliasInsight } from './types';

export const decisionLabels: Record<Verdict, string> = { act: 'Eksekusi', watch: 'Pantau', skip: 'Lewati' };

type BriefInput = {
  trendTopic: string;
  role: CreativeRole;
  insight: EliasInsight;
  news: NewsContext;
  youtube: YouTubeTrends;
};

/**
 * The whole call as plain text: the API's `result`, "Salin Brief", and the
 * note saved to Arsip all use this, so they always read the same.
 */
export function executionBrief({ trendTopic, role, insight, news, youtube }: BriefInput): string {
  const lines = [
    'MAKE IT TODAY — Elias',
    `Tren: ${trendTopic}`,
    `Keputusan: ${decisionLabels[insight.decision]}`,
    `Peran: ${creativeRoleLabels[role]}`,
    '',
    insight.headline,
    `So what: ${insight.soWhat}`,
  ];
  if (insight.decision !== 'skip') {
    lines.push(`Format: ${executionFormatLabels[insight.action.format]}`, `Angle: ${insight.action.angle}`);
    if (insight.action.steps.length) lines.push('Langkah:', ...insight.action.steps.map((step, i) => `${i + 1}. ${step}`));
    if (insight.copy) lines.push('Copy:', `Hook: ${insight.copy.hook}`, `Caption: ${insight.copy.caption}`, `CTA: ${insight.copy.cta}`);
  }
  lines.push(`Kenapa: ${insight.why}`);
  if (news.status === 'ok') lines.push('', 'Konteks berita (GDELT, 24 jam):', news.summary);
  if (youtube.status === 'ok') lines.push('', `Trending YouTube ${youtube.regionCode} hari ini:`, formatYouTubeTrends(youtube));
  return lines.join('\n');
}
