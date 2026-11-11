'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { onceInView, reducedMotion } from './inView';

gsap.registerPlugin(useGSAP);

/**
 * Reveals its content when it scrolls into view: the block rises in, then
 * every `data-reveal` element inside it follows in order. Both stay hidden by
 * globals.css until then.
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
          .fromTo(element, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.7 })
          .fromTo(
            gsap.utils.toArray('[data-reveal]', element),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 },
            '<0.15',
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
