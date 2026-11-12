'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import AppHeader from '../app/AppHeader';
import Footer from '../Footer';
import MotionText from '../motion/MotionText';
import { reducedMotion } from '../motion/inView';
import { afterPageReveal } from '../motion/pageCover';

gsap.registerPlugin(useGSAP);

// The server streams nothing until the cycle is done, so progress is estimated
// from the elapsed time. The bar eases towards CEILING and only fills the rest
// once the page has arrived, so it never claims a finish that hasn't happened
const CEILING = 95;
const PACE_S = 30;

// Mirrors generate() in lib/insights/live: sources, then the trends call, then
// the per-role calls. Timed for a typical day, not tied to the real stages.
// `parts` are read in turn, the current one highlighted
const stages = [
  { from: 0, lead: 'Sedang mengumpulkan sumber dari', parts: ['YouTube', 'Google', 'Reddit', 'berita'] },
  { from: 10, lead: 'Sedang memilih', parts: ['tren yang relevan untuk hari ini'] },
  { from: 45, lead: 'Sedang menyusun', parts: ['rekomendasi untuk tiap peran'] },
];
// Seconds each source stays highlighted
const PART_S = 2;

// Once the page arrives: the rest of the bar fills in FILL_S, up to FILL_S + FILL_EXTRA_S
// from empty, while the sources light up one by one, the last as it reaches 100%.
// Everything lit then holds for HOLD_S before the screen leaves
const FILL_S = 1.6;
const FILL_EXTRA_S = 0.8;
const HOLD_S = 1.5;
// On the way out each ring zooms past, innermost first, RING_GAP_S apart.
// The blob starts wiping WIPE_AT_S into that, while the outer rings still go
const RING_ZOOM_S = 0.9;
const RING_GAP_S = 0.14;
const WIPE_AT_S = 1.1;

// The Figma background's dashed rings, innermost first, one file each so they can move apart
const rings = Array.from({ length: 7 }, (_, i) => `/images/reading-rings/ring-${i + 1}.svg`);

const SLOW_S = 90;
const STALLED_S = 180;

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "YouTube, Google, Reddit, dan berita" */
function listJoiner(i: number, count: number): string {
  if (i === count - 1) return '';
  return i === count - 2 ? ', dan ' : ', ';
}

type CycleLoadingProps = {
  signedIn: boolean;
  /** The page has streamed in underneath: fill the bar to 100%, then leave */
  arrived: boolean;
  /** The rings are zooming out: time to wipe over to the page */
  onLeave: () => void;
};

/**
 * Shown by CycleGate while today's cycle is generated, which only the first
 * visit of the WIB day waits for. Outside AppShell, so it runs its own entrance.
 */
export default function CycleLoading({ signedIn, arrived, onLeave }: CycleLoadingProps) {
  const scope = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  // Set while the bar fills the rest of the way after the page arrives
  const [filled, setFilled] = useState<number | null>(null);
  // How many sources are lit, in order, once the page has arrived
  const [retrieved, setRetrieved] = useState(0);

  // The clock stops once the page has arrived
  useEffect(() => {
    if (arrived) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [arrived]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap
          .timeline({ paused: true, defaults: { ease: 'power3.out' } })
          .fromTo('[data-animate="header"]', { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.6 })
          .fromTo('[data-animate="rings"]', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, '<')
          .fromTo(
            '[data-animate="page-item"]',
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 },
            '<0.1',
          )
          .fromTo('[data-animate="footer"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.3');

        // A sonar while Elias reads: each ring turns against its neighbours, so the
        // gradient's bright arcs orbit, and a swell ripples outwards through them
        const ringEls = gsap.utils.toArray<HTMLElement>('[data-ring]');
        ringEls.forEach((ring, i) => {
          gsap.to(ring, { rotation: i % 2 ? -360 : 360, duration: 50 + i * 15, ease: 'none', repeat: -1 });
        });
        gsap.fromTo(
          ringEls,
          { opacity: 0.55, scale: 0.985 },
          {
            opacity: 1,
            scale: 1.015,
            duration: 1.2,
            ease: 'sine.inOut',
            stagger: { each: 0.25, repeat: -1, yoyo: true },
          },
        );

        // This screen holds the page's entrance back, so it only waits for the page-turn blob
        return afterPageReveal(() => timeline.play(), { overHold: true });
      });
      return () => mm.revert();
    },
    { scope },
  );

  const estimate = Math.round(CEILING * (1 - Math.exp(-elapsed / PACE_S)));

  // Fill to 100% as the sources light up in order, hold with everything lit,
  // then leave: the text lifts away, the rings zoom past one by one, and the
  // page-turn blob wipes over to the page
  useGSAP(
    () => {
      if (!arrived) return;
      const sources = stages[0].parts.length;
      if (reducedMotion()) {
        setFilled(100);
        setRetrieved(sources);
        gsap.delayedCall(HOLD_S, onLeave);
        return;
      }
      const bar = { value: estimate };
      const fill = FILL_S + (FILL_EXTRA_S * (100 - estimate)) / 100;
      const timeline = gsap.timeline().to(bar, {
        value: 100,
        duration: fill,
        ease: 'none',
        onUpdate: () => setFilled(bar.value),
      });
      // Evenly through the fill, so berita lights as the bar reaches 100%
      for (let i = 1; i <= sources; i++) {
        timeline.call(() => setRetrieved(i), undefined, (fill * i) / sources);
      }
      const ringEls = gsap.utils.toArray<HTMLElement>('[data-ring]');
      timeline
        .addLabel('leave', fill + HOLD_S)
        .to('[data-animate="page-item"]', { autoAlpha: 0, y: -16, duration: 0.4, stagger: 0.05, ease: 'power2.in' }, 'leave')
        // The swell lets go of the rings; they keep turning as they fly past
        .call(() => gsap.killTweensOf(ringEls, 'scale,opacity'), undefined, 'leave')
        .to(
          ringEls,
          {
            scale: 2.6,
            opacity: 0,
            duration: RING_ZOOM_S,
            ease: 'power3.in',
            stagger: RING_GAP_S,
          },
          'leave+=0.15',
        )
        .call(onLeave, undefined, `leave+=${WIPE_AT_S}`);
    },
    // CycleGate only ever moves forward, so the callbacks needn't restart this
    { scope, dependencies: [arrived] },
  );

  const percent = filled === null ? estimate : Math.round(filled);
  // Once arrived, back on the sources, which light up and stay lit in order
  // (the Success state). Before that the highlight only moves, as a hint of reading
  const stage = arrived ? stages[0] : (stages.findLast((s) => elapsed >= s.from) ?? stages[0]);
  const current = Math.floor((elapsed - stage.from) / PART_S) % stage.parts.length;
  const lit = (i: number) => (arrived ? i < retrieved : i === current);
  const note =
    arrived || elapsed < SLOW_S
      ? 'Perkiraan selesai satu menit'
      : elapsed >= STALLED_S
      ? <>Lebih lama dari biasanya. <strong>Muat ulang halaman aman</strong>, Elias melanjutkan siklus yang sama.</>
      : <><strong>Masih bekerja.</strong> Model sedang ramai hari ini, jadi butuh sedikit lebih lama.</>;

  return (
    <div ref={scope} className="flex min-h-screen flex-col bg-bg-white">
      <AppHeader signedIn={signedIn} />

      <main className="relative flex min-h-[calc(100svh-72px)] items-center justify-center overflow-hidden px-8 py-5 md:px-[120px] laptop:min-h-[calc(100svh-80px)]">
        {/* Concentric, so each 1581×1581 ring lines up on the same centre */}
        <div
          data-animate="rings"
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-[1581px] -translate-x-1/2 -translate-y-1/2"
        >
          {/* Lazy, so visits that never show this screen never fetch them */}
          {rings.map((ring) => (
            <Image
              key={ring}
              data-ring
              src={ring}
              alt=""
              width={1581}
              height={1581}
              className="absolute inset-0 max-w-none will-change-transform"
            />
          ))}
        </div>

        <div className="relative flex w-full max-w-[800px] flex-col items-center gap-3 text-center">
          <div data-animate="page-item" className="flex w-full flex-col gap-1">
            <MotionText as="p" effect="type" delay={0.1} text="SIKLUS HARI INI" className="font-mono text-xs md:text-md" />
            <MotionText
              as="h1"
              effect="scramble"
              delay={0.25}
              text="Elias Sedang Membaca Trend Hari ini"
              className="text-display-sm font-semibold max-md:tracking-normal md:text-display-lg"
            />
          </div>

          <div data-animate="page-item" className="flex w-full flex-col items-end">
            <div className="flex w-full flex-col gap-2">
              <div
                role="progressbar"
                aria-label="Perkiraan progres siklus hari ini"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={arrived ? `${percent}%` : `Sekitar ${percent}%`}
                className={`relative h-2 w-full overflow-hidden rounded-lg transition-colors duration-500 ${
                  arrived ? 'bg-primary-surface' : 'bg-ink-10'
                }`}
              >
                {/* Full width and clipped to the progress, so the Success gradient spans
                    the whole track as in Figma rather than squeezing into the fill */}
                <div
                  // GSAP drives the final fill frame by frame, so no transition then
                  className={`absolute inset-0 ${
                    filled === null ? 'transition-[clip-path] duration-1000 ease-linear motion-reduce:transition-none' : ''
                  }`}
                  // A sliver at 0%, so the bar reads as started
                  style={{ clipPath: `inset(0 ${100 - Math.max(filled ?? estimate, 2.5)}% 0 0 round 4px)` }}
                >
                  <div className="absolute inset-0 bg-primary" />
                  <div
                    className={`absolute inset-0 bg-linear-to-r from-primary via-spark-via to-spark-to transition-opacity duration-500 ${
                      arrived ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              </div>
              <div className="flex justify-between font-inter text-sm font-medium text-ink-50 tabular-nums">
                <span>{percent}%</span>
                <span aria-label={`Berjalan ${clock(elapsed)}`}>{clock(elapsed)}</span>
              </div>
            </div>
            <p className="text-right text-xs text-disabled-content">{note}</p>
          </div>

          <div data-animate="page-item" className="flex w-full flex-col items-center">
            {/* Read once per stage; the highlight moving across the sources is only visual */}
            <p role="status" className="sr-only">
              {arrived
                ? 'Selesai membaca tren hari ini.'
                : `${stage.lead} ${stage.parts.map((part, i) => part + listJoiner(i, stage.parts.length)).join('')}.`}
            </p>
            <p aria-hidden className="text-sm md:text-lg">
              {stage.lead}
            </p>
            <p aria-hidden className="text-lg font-semibold text-disabled-surface md:text-2xl">
              {stage.parts.map((part, i) => {
                const last = i === stage.parts.length - 1;
                // Each source lights with its own comma, as in "YouTube,", and berita with its "dan"
                return (
                  <span key={part}>
                    <span className={`transition-colors duration-300 ${lit(i) ? 'text-primary' : ''}`}>
                      {last && i > 0 ? 'dan ' : ''}
                      {part}
                      {listJoiner(i, stage.parts.length).startsWith(',') ? ',' : ''}
                    </span>
                    {last ? '' : ' '}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
