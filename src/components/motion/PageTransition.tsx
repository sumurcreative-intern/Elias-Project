'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { reducedMotion } from './inView';
import { setPageCovered, setPageTurner, setPageWiper } from './pageCover';

// Rounder at the leading edge while it travels, looser once it fills the screen
const SHAPE_TRAVEL = '50% 50% 40% 60% / 60% 50% 50% 40%';
const SHAPE_FULL = '44% 56% 52% 48% / 52% 44% 56% 48%';
// If a navigation never settles, lift the blob anyway rather than strand the user
const STUCK_MS = 10000;

type Phase = 'idle' | 'covering' | 'loading' | 'lifting';

/**
 * Page turn between routes: a gradient blob rises from below and morphs as it
 * covers the screen, the route changes underneath, then it carries on up and
 * off while the new page's entrance follows it. Intercepts plain left-clicks
 * on internal links to a different path; everything else navigates as usual.
 */
export default function PageTransition() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const blob = useRef<HTMLDivElement>(null);
  const phase = useRef<Phase>('idle');
  const stuck = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lift = () => {
    if (phase.current !== 'loading') return;
    phase.current = 'lifting';
    clearTimeout(stuck.current);
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(blob.current, { autoAlpha: 0 });
          phase.current = 'idle';
        },
      })
      .to(blob.current, { yPercent: -135, scale: 1.3, borderRadius: SHAPE_TRAVEL, duration: 0.75, ease: 'power3.inOut' })
      // Content starts rising while the blob's tail is still clearing the screen
      .call(() => setPageCovered(false), undefined, 0.18);
  };

  // Rises over the screen, then hands over to `covered` with it hidden
  const cover = (covered: () => void) => {
    phase.current = 'covering';
    setPageCovered(true);
    gsap
      .timeline({
        onComplete: () => {
          phase.current = 'loading';
          covered();
        },
      })
      .set(blob.current, { autoAlpha: 1, yPercent: 110, scale: 1.2, borderRadius: SHAPE_TRAVEL })
      .to(blob.current, { yPercent: -12, scale: 1.3, borderRadius: SHAPE_FULL, duration: 0.6, ease: 'power3.inOut' });
  };

  // Covers the screen, then navigates underneath. False when the blob can't play
  const turn = (href: string, { refresh = false } = {}) => {
    if (reducedMotion() || !blob.current) return false;
    if (phase.current !== 'idle') return true;
    router.prefetch(href);
    cover(() => {
      startTransition(() => {
        router.push(href);
        if (refresh) router.refresh();
      });
      stuck.current = setTimeout(lift, STUCK_MS);
    });
    return true;
  };

  // Covers the screen, swaps what's underneath without navigating, then lifts
  // once React has painted the swap
  const wipe = (swap: () => void) => {
    if (reducedMotion() || !blob.current || phase.current !== 'idle') return false;
    cover(() => {
      swap();
      requestAnimationFrame(() => requestAnimationFrame(lift));
    });
    return true;
  };

  useEffect(() => setPageTurner(turn));
  useEffect(() => setPageWiper(wipe));

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      if (link.hasAttribute('data-no-transition')) return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      // Filters, pages and anchors stay instant; route handlers aren't pages
      if (url.pathname === location.pathname) return;
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
      if (turn(url.pathname + url.search + url.hash)) event.preventDefault();
    };

    // Capture phase: runs before next/link's own handler, which then sees defaultPrevented
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // The push's transition settles once the new route has rendered underneath
  useEffect(() => {
    if (!isPending) lift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  useEffect(() => () => clearTimeout(stuck.current), []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <div
        ref={blob}
        className="pointer-events-auto invisible absolute top-0 -left-[30%] h-[120%] w-[160%] bg-[linear-gradient(150deg,var(--color-primary)_0%,#d0292f_46%,#3a3962_100%)] will-change-transform"
      />
    </div>
  );
}
