'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { CaretDown, Check, CircleNotch, Copy, MagicWand, WarningCircle } from '@phosphor-icons/react';
import { archetypeDirections } from '@/lib/archetypes';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { executionBrief } from '@/lib/elias/brief';
import { setBrief } from '@/lib/elias/briefs';
import { cachedInsight, requestInsight } from '@/lib/elias/client';
import {
  executionFormatLabels,
  type BrandContext,
  type EliasInsight,
  type InsightError,
  type InsightErrorCode,
  type InsightRequest,
  type NewsContext,
  type YouTubeTrends,
} from '@/lib/elias/types';
import { sources, type Insight } from '@/lib/insights/types';

type EliasTrendCardProps = {
  insight: Insight;
  brandContext: BrandContext;
  userRole: CreativeRole;
};

type Grounded = { result: EliasInsight; news: NewsContext; youtube: YouTubeTrends };

type State = { kind: 'idle' } | { kind: 'loading' } | ({ kind: 'done' } & Grounded) | { kind: 'error'; error: InsightError };

// Retrying these can't succeed until something changes outside this card
const finalErrors: InsightErrorCode[] = ['daily_limit', 'user_limit', 'not_configured', 'unauthorized', 'forbidden'];

const sectionLabel = 'font-mono text-xs text-disabled-content uppercase';
// Ignition Red only on verbs; Deep Ember is its hover
const smallCta =
  'flex w-fit items-center gap-2 rounded-[4px] bg-primary px-3 py-2 text-xs font-semibold text-bg-white transition-colors hover:bg-ember';
const secondaryButton =
  'flex w-fit items-center gap-2 rounded-[4px] border border-txt-white px-3 py-2 text-xs font-medium text-txt-white transition-colors hover:border-primary hover:text-primary';

function waitText(seconds: number | undefined): string {
  if (!seconds) return '';
  if (seconds < 120) return ' Coba lagi dalam sekitar satu menit.';
  const hours = Math.round(seconds / 3600);
  return hours >= 1 ? ` Kuota kembali dalam sekitar ${hours} jam.` : ` Kuota kembali dalam sekitar ${Math.ceil(seconds / 60)} menit.`;
}

/**
 * Live, role-tailored call on one trend from the Elias insight API. Runs only
 * when asked, since every fresh answer spends the shared free-tier quota.
 */
export default function EliasTrendCard({ insight, brandContext, userRole }: EliasTrendCardProps) {
  // Tags are the short keywords GDELT needs; a whole sentence matches no news
  const request: InsightRequest = {
    brandContext,
    trendTopic: insight.signal,
    userRole,
    trendDetails: {
      source: sources[insight.source].label,
      observedOn: insight.observedOn,
      tags: insight.tags,
      lifecycle: insight.lifecycle ?? null,
      whyItMatters: insight.whyItMatters,
      generalVerdict: insight.verdict,
      evidence: (insight.evidence ?? []).map(({ title, detail }) => ({ title, detail })),
    },
    // The server drops format words like "shorts" and keeps the first few subjects
    newsKeywords: insight.tags,
  };
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  // A fresh analysis opens to be read; one restored from the session starts closed, so the feed stays short
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const archetype = brandContext.archetype ? archetypeDirections[brandContext.archetype]?.name : null;

  // Session storage only exists in the browser, so a cached answer is restored after mount
  useEffect(() => {
    const cached = cachedInsight(request);
    if (cached) setState({ kind: 'done', result: cached.insight, news: cached.news, youtube: cached.youtube });
    // The request never changes for a mounted card
  }, []);

  async function analyse() {
    setState({ kind: 'loading' });
    const response = await requestInsight(request);
    setState(
      response.ok
        ? { kind: 'done', result: response.insight, news: response.news, youtube: response.youtube }
        : { kind: 'error', error: response.error },
    );
    setExpanded(true);
  }


  const briefFor = ({ result, news, youtube }: Grounded) =>
    executionBrief({ trendTopic: insight.signal, role: userRole, insight: result, news, youtube });

  async function copyBrief(grounded: Grounded) {
    try {
      await navigator.clipboard.writeText(briefFor(grounded));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied); nothing to undo
    }
  }

  // The card's Save to Archive button stores this brief with the card
  useEffect(() => {
    if (state.kind === 'done') setBrief(insight.id, briefFor(state));
    // briefFor only reads the props of this mounted card
  }, [state]);

  return (
    <section
      aria-label={`Analisis Elias untuk ${creativeRoleLabels[userRole]}`}
      className="flex flex-col gap-2.5 rounded-[4px] bg-txt-black p-5 text-paper"
    >
      <ul aria-label="Disesuaikan untuk" className="flex flex-wrap gap-2.5">
        {[creativeRoleLabels[userRole], archetype].filter(Boolean).map((label) => (
          <li key={label} className="border border-primary px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase">
            {label}
          </li>
        ))}
      </ul>

      {state.kind === 'idle' && (
        <>
          <p className="text-md font-medium text-txt-white">So what untuk peran kamu, <strong className="font-bold">satu action brief yang bisa dikerjakan hari ini</strong>, juga saran copy sesuai tone brand.</p>
          <button type="button" onClick={analyse} className={smallCta}>
            <MagicWand size={16} aria-hidden />
            Analisis topik tren ini untuk brand kamu
          </button>
        </>
      )}

      {state.kind === 'loading' && (
        <p role="status" className="flex items-center gap-2 font-mono text-sm text-paper/80">
          <CircleNotch size={18} aria-hidden className="animate-spin" />
          Elias sedang menganalisis…
        </p>
      )}

      {state.kind === 'error' && (
        <div role="alert" className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm text-paper">
            <WarningCircle size={18} aria-hidden className="mt-px shrink-0 text-paper/70" />
            {state.error.message}
            {waitText(state.error.retryAfter)}
          </p>
          {!finalErrors.includes(state.error.code) && (
            <button type="button" onClick={analyse} className={secondaryButton}>
              Coba lagi
            </button>
          )}
          {/* The page was rendered signed in, but the session ended since */}
          {state.error.code === 'unauthorized' && (
            <Link href="/login" className={secondaryButton}>
              Masuk lagi
            </Link>
          )}
        </div>
      )}

      {state.kind === 'done' && (
        <>
          {/* Decision first */}
          <p className="border-l-2 border-primary pl-[18px] text-2xl font-bold text-txt-white">{state.result.headline}</p>

          {/* Folds by animating its row from 0fr to 1fr; inert while closed so focus skips it */}
          <div
            id={detailsId}
            inert={!expanded}
            className={`grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none ${
              expanded ? 'grid-rows-[1fr]' : '-mt-2.5 grid-rows-[0fr]'
            }`}
          >
            <div className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
              <div className="flex flex-col gap-1.5">
                <p className={sectionLabel}>So what</p>
                <p className="text-md text-txt-white">{state.result.soWhat}</p>
                <p className="text-xs text-disabled-surface">{state.result.why}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className={sectionLabel}>Make it today</p>
                {state.result.decision === 'skip' ? (
                  <p className="text-md font-bold text-txt-white">
                    Tidak ada yang perlu diproduksi untuk tren ini. Waktu kamu lebih berharga di tempat lain.
                  </p>
                ) : (
                  <div className="flex flex-col text-md text-txt-white">
                    <p className="font-bold">{executionFormatLabels[state.result.action.format]}</p>
                    <p>{state.result.action.angle}</p>
                    {state.result.action.steps.length > 0 && (
                      <ol className="mt-1.5 list-decimal pl-[18px] text-xs text-disabled-surface">
                        {state.result.action.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {state.result.decision !== 'skip' && state.result.copy && (
                <>
                  <div className="h-px bg-disabled-content" />
                  <div className="flex flex-col gap-2.5">
                    <p className="text-md font-bold text-txt-white">
                      Saran Copy{archetype && <span className="sr-only"> sesuai tone {archetype}</span>}
                    </p>
                    <dl className="flex flex-col gap-2.5 rounded-[4px] border border-disabled-content p-4">
                      {(
                        [
                          ['Hook', state.result.copy.hook],
                          ['Caption', state.result.copy.caption],
                          ['CTA', state.result.copy.cta],
                        ] as const
                      ).map(([label, text]) => (
                        <div key={label} className="flex flex-col">
                          <dt className={sectionLabel}>{label}</dt>
                          <dd className="text-sm text-txt-white">{text}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <button type="button" onClick={() => copyBrief(state)} className={secondaryButton}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? 'Tersalin' : 'Salin Brief'}
            </button>
            <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={detailsId} className={secondaryButton}>
              {expanded ? 'Tutup' : 'Buka'}
              <CaretDown size={16} aria-hidden className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
