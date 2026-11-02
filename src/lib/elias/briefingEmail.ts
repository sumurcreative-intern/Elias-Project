import { creativeRoleLabels, type CreativeRole } from '../creativeRoles';
import type { NewsContext } from '../gdelt';
import type { YouTubeTrends } from '../youtube';
import { decisionLabels } from './brief';
import { executionFormatLabels, type EliasInsight } from './types';

// Email clients ignore stylesheets and CSS variables, so the design tokens
// are repeated here as literals: Studio Ink, Paper, Ignition Red
const ink = '#0C0B10';
const paper = '#F2EFEA';
const muted = '#A1A1AA';
const border = '#27272A';
const accent = '#FC3C2F';
const mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const sans = "Archivo, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type BriefingEmailInput = {
  label: string;
  trendTopic: string;
  role: CreativeRole;
  insight: EliasInsight;
  news: NewsContext;
  youtube: YouTubeTrends;
};

/** Model output and source titles are untrusted text. */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const monoLabel = (text: string, color = muted) =>
  `<div style="font-family:${mono};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${color};margin:0 0 8px">${esc(text)}</div>`;

const section = (inner: string) => `<tr><td style="padding:24px 32px;border-top:1px solid ${border}">${inner}</td></tr>`;

const paragraph = (text: string) =>
  `<p style="margin:0;font-family:${sans};font-size:15px;line-height:24px;color:${paper}">${esc(text)}</p>`;

function actionSection(insight: EliasInsight): string {
  if (insight.decision === 'skip') {
    return section(`${monoLabel('Make It Today')}${paragraph('Tidak ada yang perlu diproduksi untuk tren ini hari ini.')}`);
  }
  const steps = insight.action.steps
    .map(
      (step, i) =>
        `<tr><td valign="top" style="font-family:${mono};font-size:13px;color:${accent};padding:0 12px 8px 0">${String(i + 1).padStart(2, '0')}</td><td style="font-family:${sans};font-size:15px;line-height:24px;color:${paper};padding:0 0 8px">${esc(step)}</td></tr>`,
    )
    .join('');
  return section(
    `${monoLabel('Make It Today')}` +
      `<div style="font-family:${mono};font-size:12px;color:${accent};margin:0 0 8px">FORMAT: ${esc(executionFormatLabels[insight.action.format])}</div>` +
      `<p style="margin:0 0 16px;font-family:${sans};font-size:17px;line-height:26px;font-weight:600;color:${paper}">${esc(insight.action.angle)}</p>` +
      (steps ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${steps}</table>` : ''),
  );
}

function contextSection(news: NewsContext, youtube: YouTubeTrends): string {
  const link = (href: string, text: string) =>
    `<a href="${esc(href)}" style="color:${paper};text-decoration:underline;text-decoration-color:${border}">${esc(text)}</a>`;
  const item = (inner: string) =>
    `<li style="margin:0 0 6px;font-family:${sans};font-size:13px;line-height:20px;color:${muted}">${inner}</li>`;
  const list = (items: string[]) => `<ul style="margin:0 0 16px;padding:0 0 0 18px">${items.join('')}</ul>`;

  const parts: string[] = [];
  parts.push(monoLabel('// Context: GDELT · 24 jam'));
  parts.push(
    news.status === 'ok'
      ? list(news.articles.map((a) => item(`[${esc(a.domain)}] ${link(a.url, a.title)}`)))
      : `<p style="margin:0 0 16px;font-family:${sans};font-size:13px;color:${muted}">${esc(news.summary)}</p>`,
  );
  if (youtube.status === 'ok') {
    parts.push(monoLabel(`// Trending YouTube ${youtube.regionCode} · chart umum, bukan tentang tren ini`));
    parts.push(
      list(
        youtube.videos.map((v) =>
          item(`${link(`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`, v.title)} — ${esc(v.channelTitle)}`),
        ),
      ),
    );
  }
  return section(parts.join(''));
}

/** The Daily Briefing as an email: claim first, one action, sources last (ED-3, V2). */
export function briefingEmailHtml({ label, trendTopic, role, insight, news, youtube }: BriefingEmailInput): string {
  const decisionColor = insight.decision === 'act' ? accent : insight.decision === 'watch' ? '#F59E0B' : muted;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(insight.headline)}</title>
</head>
<body style="margin:0;padding:0;background:${ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ink}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border:1px solid ${border};background:${ink}">
<tr><td style="padding:28px 32px 24px">
${monoLabel(label, accent)}
<div style="font-family:${mono};font-size:11px;color:${muted};margin:0 0 20px">TREN: ${esc(trendTopic)} // ROLE: ${esc(creativeRoleLabels[role])}</div>
<span style="display:inline-block;font-family:${mono};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${decisionColor};border:1px solid ${decisionColor};padding:4px 8px;margin:0 0 16px">${esc(decisionLabels[insight.decision])}</span>
<h1 style="margin:0;padding:0 0 0 14px;border-left:4px solid ${accent};font-family:${sans};font-size:22px;line-height:30px;font-weight:700;color:${paper}">${esc(insight.headline)}</h1>
</td></tr>
${section(`${monoLabel('So what')}${paragraph(insight.soWhat)}`)}
${actionSection(insight)}
${section(`${monoLabel('Kenapa')}${paragraph(insight.why)}`)}
${contextSection(news, youtube)}
<tr><td style="padding:20px 32px;border-top:1px solid ${border};font-family:${mono};font-size:11px;color:${muted}">ELIAS — Daily Creative Intelligence · Sumur Creative</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
