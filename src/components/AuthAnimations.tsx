'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

type AuthAnimationsProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Entrance choreography for the auth pages. Targets elements by
 * `data-animate` so the page components stay presentational.
 */
export default function AuthAnimations({ className, children }: AuthAnimationsProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo('[data-animate="header"]', { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.6 });

        if (window.matchMedia('(min-width: 1200px)').matches) {
          tl.fromTo(
            '[data-animate="hero"]',
            { autoAlpha: 0, clipPath: 'inset(8% 8% 8% 8% round 32px)' },
            { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0% round 32px)', duration: 1, ease: 'expo.out' },
            '-=0.3',
          ).fromTo(
            '[data-animate="hero-line"]',
            { autoAlpha: 0, yPercent: 60 },
            { autoAlpha: 1, yPercent: 0, duration: 0.7, stagger: 0.08 },
            '-=0.6',
          );
        } else {
          gsap.set(['[data-animate="hero"]', '[data-animate="hero-line"]'], { autoAlpha: 1 });
        }

        tl.fromTo(
          '[data-animate="form-item"]',
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 },
          '<0.1',
        ).fromTo('[data-animate="footer"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.3');

        // Sign-up phase tracker: fill the current phase's connector
        if (scope.current?.querySelector('[data-animate="progress"]')) {
          tl.fromTo(
            '[data-animate="progress"]',
            { autoAlpha: 1, scaleX: 0 },
            { scaleX: 1, duration: 0.9, ease: 'power2.inOut' },
            0.4,
          );
        }
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
