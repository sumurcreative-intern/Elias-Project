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
  observer.observe(element);
  return () => observer.disconnect();
}
