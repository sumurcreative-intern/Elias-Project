'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { onceInView, reducedMotion, REVEAL_CUE } from './inView';

gsap.registerPlugin(useGSAP);

/**
 * Reveals its content when it scrolls into view: the block grows out of a
 * small box, then cues the MotionText heading inside it, then every
 * `data-reveal` element follows in order. All stay hidden by globals.css
 * until then.
 */
export default function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const element = root.current;
      if (!element || reducedMotion()) return;
      const play = contextSafe!(() => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          // A transform, so the masonry layout never sees the box's smaller size
          .fromTo(
            element,
            { autoAlpha: 0, scale: 0.4 },
            { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out', clearProps: 'transform' },
          )
          .call(
            () => {
              element.setAttribute('data-cued', '');
              element.dispatchEvent(new Event(REVEAL_CUE));
            },
            undefined,
            '-=0.25',
          )
          .fromTo(
            gsap.utils.toArray('[data-reveal]', element),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 },
            '<0.35',
          );
      });
      return onceInView(element, play);
    },
    { scope: root },
  );

  return (
    <div ref={root} data-animate="scroll" className={className}>
      {children}
    </div>
  );
}
