import { afterPageReveal, OVER_HOLD } from './pageCover';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Calls `play` once, when `element` first scrolls into view or right away if
 * it already is. An observer rather than ScrollTrigger: masonry packing and an
 * expanding analysis move cards after mount, which would leave precomputed
 * trigger positions stale. Returns the cleanup.
 */
export function onceInView(element: Element, play: () => void): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      play();
    },
    // Starts a little before the bottom edge, so the motion is seen, not missed
    { rootMargin: '0px 0px -8% 0px' },
  );
  // Content under the page-turn blob, or under a screen holding the page, counts as
  // in view, so start watching once it lifts. The holding screen's own text needn't wait
  const cancel = afterPageReveal(() => observer.observe(element), { overHold: element.closest(`[${OVER_HOLD}]`) !== null });
  return () => {
    cancel();
    observer.disconnect();
  };
}

/** Fired by a ScrollReveal block once its box has grown in */
export const REVEAL_CUE = 'scrollreveal:cue';

/**
 * Like onceInView, except inside a ScrollReveal block it waits for that
 * block's cue, so a heading plays after its box rather than on its own. A
 * block already cued (the text re-rendered later) plays right away.
 */
export function onceCued(element: Element, play: () => void): () => void {
  const block = element.parentElement?.closest('[data-animate="scroll"]');
  if (!block) return onceInView(element, play);
  if (block.hasAttribute('data-cued')) {
    play();
    return () => {};
  }
  block.addEventListener(REVEAL_CUE, play, { once: true });
  return () => block.removeEventListener(REVEAL_CUE, play);
}
