'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowClockwise, ArrowUpRight, CircleNotch, MagnifyingGlass, WarningCircle, YoutubeLogo, type Icon } from '@phosphor-icons/react';
import type { TrendingResponse } from '@/app/api/trending/route';
import type { Trending } from '@/lib/insights/trending';
import MotionText from '../motion/MotionText';

const monoLabel = 'font-mono text-xs font-bold tracking-wide text-gray-600 uppercase';
const chip =
  'group flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm transition-colors hover:border-txt-black';
// Ignition Red only on verbs; Deep Ember is its hover
const primaryCta =
  'flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-bg-white transition-colors hover:bg-ember disabled:bg-primary/60';
const quietLink = 'w-fit text-sm font-semibold text-neutral-600 underline-offset-2 transition-colors hover:text-txt-black hover:underline';

type Chip = { term: string; detail: string | null; url: string };

// Mixed widths so the placeholder reads like a row of real terms
const skeletonWidths = ['w-28', 'w-36', 'w-24', 'w-32', 'w-20', 'w-40', 'w-28', 'w-24'];

/** Placeholder pills, sized like a chip, with a shimmer GSAP sweeps across. */
function ChipSkeleton() {
  return (
    <ul aria-hidden className="flex flex-wrap gap-2">
      {skeletonWidths.map((width, i) => (
        <li key={i} data-skeleton className={`relative h-[34px] overflow-hidden rounded-full bg-neutral-200 ${width}`}>
          <span
            data-shimmer
            className="absolute inset-y-0 -left-full w-full bg-linear-to-r from-transparent via-white/70 to-transparent"
          />
        </li>
      ))}
    </ul>
  );
}

type ChipListProps = { label: string; icon: Icon; chips: Chip[]; empty: string; loading: boolean };

function ChipList({ label, icon: SourceIcon, chips, empty, loading }: ChipListProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className={`flex items-center gap-1.5 ${monoLabel}`}>
        <SourceIcon size={14} aria-hidden />
        {label}
      </p>
      {loading ? (
        <ChipSkeleton />
      ) : chips.length ? (
        <ul className="flex flex-wrap gap-2">
          {chips.map((item) => (
            <li key={item.term} data-chip>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={chip}>
                <span className="font-semibold">{item.term}</span>
                {item.detail && <span className="text-gray-600">· {item.detail}</span>}
                <ArrowUpRight size={14} aria-hidden className="text-gray-600 group-hover:text-txt-black" />
                <span className="sr-only">(buka di tab baru)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-600">{empty}</p>
      )}
    </div>
  );
}

const wibTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(iso));

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string; signedOut: boolean };

type TrendingTopicsProps = {
  /** Today's stored searches and topics across every category */
  initial: Trending;
  /** The signed-in user's brand category label; null hides the refresh (guests, no category) */
  brandLabel: string | null;
};

/**
 * "Lagi ramai hari ini": Google's trending searches and the topics repeated
 * across today's YouTube charts, as they were captured. A signed-in brand can
 * pull the latest for its category (/api/trending). Only Google and YouTube
 * are named, so nothing implies TikTok or Instagram coverage (BR-5).
 */
export default function TrendingTopics({ initial, brandLabel }: TrendingTopicsProps) {
  const [trending, setTrending] = useState(initial);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const scope = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const { searches, topics, brand } = trending;
  const loading = state.kind === 'loading';

  // Loading: the skeleton pops in and shimmers. Done: the fetched chips fade
  // up in place of it. The first render is left to AppShell's page reveal
  useGSAP(
    () => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (loading) {
          gsap.fromTo(
            '[data-skeleton]',
            { autoAlpha: 0, scale: 0.94 },
            { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out' },
          );
          // Each pill loops on its own, offset from its neighbours, so the sweep ripples along the row
          gsap.to('[data-shimmer]', {
            xPercent: 200,
            duration: 1.1,
            ease: 'power1.inOut',
            stagger: { each: 0.08, repeat: -1, repeatDelay: 0.4 },
          });
        } else {
          gsap.fromTo(
            '[data-chip]',
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.025, ease: 'power2.out' },
          );
        }
      });
      return () => mm.revert();
    },
    { scope, dependencies: [loading] },
  );

  if (!searches.length && !topics.length && !brandLabel) return null;

  async function refresh() {
    setState({ kind: 'loading' });
    let result: TrendingResponse;
    let status = 0;
    try {
      const response = await fetch('/api/trending', { method: 'POST' });
      status = response.status;
      result = (await response.json()) as TrendingResponse;
    } catch {
      result = { ok: false, error: { message: 'Koneksi terputus. Periksa jaringan lalu coba lagi.' } };
    }
    if (result.ok) {
      setTrending(result.trending);
      setState({ kind: 'idle' });
    } else {
      setState({ kind: 'error', message: result.error.message, signedOut: status === 401 });
    }
  }

  return (
    <section
      data-animate="page-item"
      aria-labelledby="trending-topics"
      className="flex flex-col gap-5 rounded-2xl border border-neutral-200 p-5 md:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <MotionText
            as="h2"
            id="trending-topics"
            effect="type"
            delay={0.3}
            text={brand ? `Lagi ramai untuk ${brand}` : 'Lagi ramai hari ini'}
            className="text-lg font-semibold"
          />
          <p aria-live="polite" className="text-sm text-neutral-600">
            {brand
              ? `Diambil ${wibTime(trending.readAt)} WIB dari chart YouTube kategori ${brand} dan pencarian Google terbaru. Belum dipilih Elias.`
              : 'Data mentah dari Google dan YouTube Indonesia, sebelum dipilih Elias. Belum tentu layak untuk brand kamu.'}
          </p>
        </div>

        {brandLabel && (
          <div className="flex shrink-0 flex-col gap-2 md:items-end">
            <button type="button" onClick={refresh} disabled={loading} className={primaryCta}>
              {loading ? <CircleNotch size={18} aria-hidden className="animate-spin" /> : <ArrowClockwise size={18} aria-hidden />}
              {loading ? 'Mengambil tren…' : brand ? 'Perbarui lagi' : `Tren terbaru untuk ${brandLabel}`}
            </button>
            {brand && !loading && (
              <button type="button" onClick={() => setTrending(initial)} className={quietLink}>
                Tampilkan semua kategori
              </button>
            )}
          </div>
        )}
      </div>

      {state.kind === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p className="flex items-start gap-2">
            <WarningCircle size={18} aria-hidden className="mt-px shrink-0 text-neutral-600" />
            {state.message}
          </p>
          {state.signedOut && (
            <Link href="/login" className={quietLink}>
              Masuk lagi
            </Link>
          )}
        </div>
      )}

      <div ref={scope} aria-busy={loading} className="grid gap-5 laptop:grid-cols-2">
        {loading && (
          <p role="status" className="sr-only">
            Mengambil tren terbaru…
          </p>
        )}
        <ChipList
          loading={loading}
          label={brand ? 'Dicari di Google · semua kategori · 24 jam' : 'Dicari di Google · 24 jam'}
          icon={MagnifyingGlass}
          empty="Belum ada pencarian yang tercatat dalam 24 jam terakhir."
          chips={searches.map((search) => ({
            term: search.term,
            detail:
              [
                search.approxTraffic ? `${search.approxTraffic.toLocaleString('id-ID')}+` : null,
                search.daysInRow > 1 ? `${search.daysInRow} hari` : null,
              ]
                .filter(Boolean)
                .join(' · ') || null,
            url: search.url,
          }))}
        />
        <ChipList
          loading={loading}
          label={brand ? `Topik berulang di YouTube · ${brand}` : 'Topik berulang di YouTube · hari ini'}
          icon={YoutubeLogo}
          empty={
            brand
              ? `Belum ada topik yang berulang di beberapa channel untuk ${brand} saat ini.`
              : 'Chart YouTube hari ini belum tersimpan.'
          }
          chips={topics.map((topic) => ({
            term: topic.term,
            detail: `${topic.videos} video · ${topic.channels} channel`,
            url: topic.url,
          }))}
        />
      </div>
    </section>
  );
}
