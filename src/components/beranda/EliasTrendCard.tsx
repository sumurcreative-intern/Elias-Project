'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowSquareOut, BookmarkSimple, CaretDown, Check, CircleNotch, Copy, Lightning, WarningCircle } from '@phosphor-icons/react';
import { archetypeDirections } from '@/lib/archetypes';
import { useArchive } from '@/lib/archive';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { decisionLabels, executionBrief } from '@/lib/elias/brief';
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
import type { Insight } from '@/lib/insights/types';

type EliasTrendCardProps = {
  insight: Insight;
  brandContext: BrandContext;
  userRole: CreativeRole;
};

type Grounded = { result: EliasInsight; news: NewsContext; youtube: YouTubeTrends };

type State = { kind: 'idle' } | { kind: 'loading' } | ({ kind: 'done' } & Grounded) | { kind: 'error'; error: InsightError };

// Retrying these can't succeed until something changes outside this card
const finalErrors: InsightErrorCode[] = ['daily_limit', 'user_limit', 'not_configured', 'unauthorized', 'forbidden'];

const monoMeta = 'font-mono text-[11px] leading-4 font-bold tracking-wide uppercase';
const monoBadge = `w-fit rounded-sm border border-paper/20 px-1.5 py-0.5 ${monoMeta}`;
const sectionLabel = `${monoMeta} text-paper/50`;
// Ignition Red only on verbs; Deep Ember is its hover
const primaryCta =
  'flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-bg-white transition-colors hover:bg-ember disabled:bg-primary/60';
const secondaryButton =
  'flex w-fit items-center gap-2 rounded-md border border-paper/30 px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:border-ember';

function waitText(seconds: number | undefined): string {
  if (!seconds) return '';
  if (seconds < 120) return ' Coba lagi dalam sekitar satu menit.';
  const hours = Math.round(seconds / 3600);
  return hours >= 1 ? ` Kuota kembali dalam sekitar ${hours} jam.` : ` Kuota kembali dalam sekitar ${Math.ceil(seconds / 60)} menit.`;
}

/** "// SOURCE: YOUTUBE // GDELT VERIFIED", naming only the sources that answered. */
function sourceLine(news: NewsContext, youtube: YouTubeTrends): string | null {
  const parts = [youtube.status === 'ok' && 'SOURCE: YOUTUBE', news.status === 'ok' && 'GDELT VERIFIED'].filter(Boolean);
  return parts.length ? `// ${parts.join(' // ')}` : null;
}

/**
 * The raw inputs behind the call. Headlines and video titles are third-party
 * text, so they stay collapsed, as links, and are never restated as fact.
 */
function ContextAccordion({ news, youtube }: { news: NewsContext; youtube: YouTubeTrends }) {
  return (
    <details className="group flex flex-col gap-2">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-paper [&::-webkit-details-marker]:hidden">
        <CaretDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
        Lihat konteks
      </summary>

      <div className="flex flex-col gap-5 pt-3">
        <div className="flex flex-col gap-2">
          <p className={sectionLabel}>Berita GDELT · 24 jam</p>
          {news.status === 'ok' ? (
            <ol className="flex flex-col gap-2">
              {news.articles.map((article) => (
                <li key={article.url} className="text-sm">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-start gap-1.5 text-paper/80 transition-colors hover:text-paper"
                  >
                    <span className="font-mono text-xs text-paper/50">[{article.domain}]</span>
                    <span className="underline-offset-2 group-hover/link:underline">{article.title}</span>
                    <ArrowSquareOut size={14} aria-hidden className="mt-0.5 shrink-0" />
                    <span className="sr-only">(buka di tab baru)</span>
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-mono text-xs text-paper/50">{`// ${news.summary}`}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* The general chart, not videos about this trend; the label says so */}
          <p className={sectionLabel}>Trending YouTube {youtube.regionCode} hari ini · bukan tentang tren ini</p>
          {youtube.status === 'ok' && youtube.videos.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {youtube.videos.map((video) => (
                <li key={video.id}>
                  <a
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-start gap-3 text-paper/80 transition-colors hover:text-paper"
                  >
                    {video.thumbnail ? (
                      <Image
                        src={video.thumbnail}
                        alt=""
                        width={120}
                        height={68}
                        className="aspect-video w-[120px] shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <span aria-hidden className="aspect-video w-[120px] shrink-0 rounded-sm bg-paper/10" />
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="line-clamp-2 text-sm underline-offset-2 group-hover/link:underline">{video.title}</span>
                      <span className="font-mono text-xs text-paper/50">
                        {video.channelTitle} · {video.viewCount.toLocaleString('id-ID')} views
                      </span>
                      <span className="sr-only">(buka di tab baru)</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-xs text-paper/50">{'// Data tren YouTube tidak tersedia saat ini.'}</p>
          )}
        </div>
      </div>
    </details>
  );
}

/**
 * Live, role-tailored call on one trend from the Elias insight API. Runs only
 * when asked, since every fresh answer spends the shared free-tier quota.
 */
export default function EliasTrendCard({ insight, brandContext, userRole }: EliasTrendCardProps) {
  // The first tag is the short keyword GDELT needs; a whole sentence matches no news
  const request: InsightRequest = { brandContext, trendTopic: insight.signal, userRole, newsKeyword: insight.tags[0] };
  const archive = useArchive();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const [briefSaved, setBriefSaved] = useState(false);
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

  function saveBrief(grounded: Grounded) {
    const brief = briefFor(grounded);
    const existing = archive.items.find((item) => item.insightId === insight.id);
    if (!existing) archive.save(insight, brief);
    else if (!existing.notes.includes(brief)) archive.setNotes(insight.id, existing.notes ? `${existing.notes}\n\n${brief}` : brief);
    setBriefSaved(true);
  }

  return (
    <section
      aria-label={`Analisis Elias untuk ${creativeRoleLabels[userRole]}`}
      className="flex flex-col gap-4 rounded-xl border border-neutral-80 bg-txt-black p-4 pt-5 text-paper md:p-5 md:pt-6"
    >
      <p className={`${monoMeta} text-paper/60`}>
        {`ARCHETYPE: ${archetype ?? '—'} // ROLE: ${creativeRoleLabels[userRole]}`}
      </p>

      {state.kind === 'idle' && (
        <>
          <p className="text-sm text-paper/70">So what untuk peran kamu, plus satu action brief yang bisa dikerjakan hari ini.</p>
          <button type="button" onClick={analyse} className={primaryCta}>
            <Lightning size={18} weight="fill" aria-hidden />
            Analisis untuk brand ini
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={monoBadge}>{decisionLabels[state.result.decision]}</span>
            {sourceLine(state.news, state.youtube) && (
              <span className={`${monoMeta} text-paper/50`}>{sourceLine(state.news, state.youtube)}</span>
            )}
          </div>

          {/* Decision first */}
          <p className="border-l-4 border-primary pl-4 text-xl font-bold">{state.result.headline}</p>

          <div className="flex flex-col gap-1.5">
            <p className={sectionLabel}>So what</p>
            <p className="text-md text-paper/90">{state.result.soWhat}</p>
            <p className="text-sm text-paper/60">{state.result.why}</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className={sectionLabel}>Make it today</p>
            {state.result.decision === 'skip' ? (
              <p className="text-md text-paper/90">Tidak ada yang perlu diproduksi untuk tren ini. Waktu kamu lebih berharga di tempat lain.</p>
            ) : (
              <>
                <p className="text-md">
                  <span className="font-semibold">{executionFormatLabels[state.result.action.format]}</span>
                  <span className="text-paper/80"> — {state.result.action.angle}</span>
                </p>
                {state.result.action.steps.length > 0 && (
                  <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-paper/80 marker:font-mono marker:text-paper/50">
                    {state.result.action.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>

          <ContextAccordion news={state.news} youtube={state.youtube} />

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => saveBrief(state)} disabled={briefSaved} className={primaryCta}>
              {briefSaved ? <Check size={18} aria-hidden /> : <BookmarkSimple size={18} aria-hidden />}
              {briefSaved ? 'Brief tersimpan di Arsip' : 'Simpan ke Arsip'}
            </button>
            <button type="button" onClick={() => copyBrief(state)} className={secondaryButton}>
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              {copied ? 'Tersalin' : 'Salin Brief'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
