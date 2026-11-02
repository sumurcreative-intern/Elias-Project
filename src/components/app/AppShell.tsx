'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArchiveProvider } from '@/lib/archive';
import Footer from '../Footer';
import AppHeader from './AppHeader';

gsap.registerPlugin(useGSAP);

/**
 * Shared frame for the app pages: header, page column, footer. Page content
 * marks its blocks with `data-animate="page-item"` to join the entrance.
 * `userId` is null for guests; it scopes the saved-trend archive.
 */
export default function AppShell({ userId, children }: { userId: string | null; children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('[data-animate="header"]', { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.6 })
          .fromTo(
            '[data-animate="page-item"]',
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 },
            '<0.1',
          )
          .fromTo('[data-animate="footer"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '-=0.3');
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <ArchiveProvider userId={userId}>
      <div ref={scope} className="flex min-h-screen flex-col bg-bg-white">
        <AppHeader signedIn={userId !== null} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-8 md:px-[30px] md:pt-12 laptop:px-20 laptop:pt-14">
          {children}
        </main>
        <Footer />
      </div>
    </ArchiveProvider>
  );
}
