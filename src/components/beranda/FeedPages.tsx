'use client';

import { useRef, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Pagination from '../arsip/Pagination';

type FeedPagesProps = {
  page: number;
  pageCount: number;
  first: number;
  last: number;
  total: number;
  /** Query kept while paging, like the prototype's quiet-day switch */
  query: string;
  /** The page's cards grouped by day, rendered on the server */
  children: ReactNode;
};

/** The last 5 days of cycles, 10 cards per numbered page (`/?halaman=N`). */
export default function FeedPages({ page, pageCount, first, last, total, query, children }: FeedPagesProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const scope = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // AppShell reveals the first page on load. Cards of a later page mount
  // after that reveal, and would stay hidden by the [data-animate] CSS
  useGSAP(
    () => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-animate="page-item"]',
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' },
        );
      });
      return () => mm.revert();
    },
    { scope, dependencies: [page] },
  );

  function goToPage(next: number) {
    const params = new URLSearchParams(query);
    if (next > 1) params.set('halaman', String(next));
    const search = params.toString();
    startTransition(() => {
      router.push(search ? `/?${search}` : '/', { scroll: false });
    });
    scope.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div ref={scope} className="flex scroll-mt-28 flex-col gap-4 md:gap-6">
      <p aria-live="polite" className="text-sm text-gray-600">
        Menampilkan {first}–{last} dari {total} tren dalam 5 hari terakhir
      </p>

      <div className={`flex flex-col gap-8 transition-opacity md:gap-10 ${pending ? 'opacity-60' : ''}`}>{children}</div>

      <Pagination page={page} pageCount={pageCount} onPage={goToPage} label="Halaman Beranda" disabled={pending} />
    </div>
  );
}
