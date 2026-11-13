'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { reducedMotion } from './inView';

// How long one wheel step glides; further steps retarget the glide from where it is
const GLIDE = 1.1;

const LINE = 16;

/** True when the wheel should go to an inner scroller, not the page (dropdowns, the cycle screen). */
function scrollsInside(target: EventTarget | null, delta: number): boolean {
  for (let node = target instanceof Element ? target : null; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (!/(auto|scroll|overlay)/.test(overflowY) || node.scrollHeight <= node.clientHeight) continue;
    const atEnd = delta > 0 ? node.scrollTop + node.clientHeight >= node.scrollHeight - 1 : node.scrollTop <= 0;
    if (!atEnd) return true;
  }
  return false;
}

/** A scroll lock (the select sheet, the cycle screen) sets overflow hidden on html or body. */
const pageLocked = () =>
  [document.documentElement, document.body].some((node) => getComputedStyle(node).overflowY === 'hidden');

/**
 * Smooth page scrolling: each mouse-wheel step eases the window's own scroll
 * position with GSAP instead of jumping. The page keeps native scrolling, so
 * sticky headers, fixed overlays, scrollIntoView and the in-view reveals work
 * as before. Touch, keyboard and scrollbar dragging stay native, and so does
 * everything under reduced motion.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (reducedMotion()) return;
    const position = { y: window.scrollY };
    let glide: gsap.core.Tween | null = null;
    let target = window.scrollY;

    const stop = () => {
      glide?.kill();
      glide = null;
    };

    const onWheel = (event: WheelEvent) => {
      // Pinch and ctrl-zoom, sideways scrolling and inner scrollers keep their native behaviour
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? event.deltaY * LINE
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      if (!delta || pageLocked() || scrollsInside(event.target, delta)) return;
      event.preventDefault();

      // A new gesture starts from wherever the page is now, not from an old target
      if (!glide) {
        position.y = window.scrollY;
        target = window.scrollY;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      target = gsap.utils.clamp(0, max, target + delta);
      glide = gsap.to(position, {
        y: target,
        duration: GLIDE,
        ease: 'expo.out',
        overwrite: true,
        onUpdate: () => window.scrollTo(0, position.y),
        onComplete: () => {
          glide = null;
        },
      });
    };

    // Grabbing the scrollbar, tapping or pressing a key hands scrolling back to the browser
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', stop);
    window.addEventListener('keydown', stop);
    window.addEventListener('touchstart', stop, { passive: true });
    return () => {
      stop();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('touchstart', stop);
    };
    // Restarted per route, so a glide never carries over the scroll reset of a navigation
  }, [pathname]);

  return null;
}
