'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../motion/inView';
import { holdPageReveal, OVER_HOLD } from '../motion/pageCover';
import CycleLoading from './CycleLoading';

// unknown: before hydration, when only CSS knows whether the cycle is pending.
// loading → arrived (the page streamed in underneath, the bar fills to 100%)
// → done, the screen fading off the page
type Phase = 'unknown' | 'loading' | 'arrived' | 'done';

const PENDING = '[data-cycle-pending]';

/**
 * The Suspense fallback inside CycleGate: marks the cycle as still generating.
 * Found in the DOM rather than through an effect, since React leaves a pending
 * boundary's server HTML unhydrated and never runs its fallback's effects.
 */
export function CyclePending() {
  return <span data-cycle-pending hidden />;
}

/**
 * Keeps the cycle loading screen over Beranda until its bar reaches 100%,
 * even when the page has already streamed in underneath, then fades it off
 * the page in 0.3s. Visits whose cycle is ready never show it.
 */
export default function CycleGate({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('unknown');

  useEffect(() => {
    const element = root.current;
    if (!element?.querySelector(PENDING)) {
      setPhase('done');
      return;
    }
    setPhase('loading');
    // The fallback leaving means the page arrived
    const observer = new MutationObserver(() => {
      if (element.querySelector(PENDING)) return;
      observer.disconnect();
      setPhase('arrived');
    });
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // The page underneath waits, so its entrance plays as the screen lifts, not unseen
  const holding = phase === 'loading' || phase === 'arrived';
  useEffect(() => (holding ? holdPageReveal() : undefined), [holding]);

  // One scrollbar: the screen's own
  useEffect(() => {
    if (!holding) return;
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = '';
    };
  }, [holding]);

  function leave() {
    if (reducedMotion() || !screen.current) {
      setPhase('done');
      return;
    }
    gsap.to(screen.current, { autoAlpha: 0, duration: 0.3, ease: 'power1.out', onComplete: () => setPhase('done') });
  }

  return (
    <div ref={root} className="group/cycle">
      {phase !== 'done' && (
        <div
          ref={screen}
          {...{ [OVER_HOLD]: '' }}
          // Before hydration, shown only while the fallback is in the page
          className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain ${
            phase === 'unknown' ? 'hidden group-has-[[data-cycle-pending]]/cycle:block' : ''
          }`}
        >
          <CycleLoading
            signedIn={signedIn}
            arrived={phase === 'arrived'}
            onLeave={leave}
          />
        </div>
      )}
      <div inert={holding}>{children}</div>
    </div>
  );
}
