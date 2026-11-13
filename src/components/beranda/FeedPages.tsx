'use client';

import { useRef, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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

/** The last 5 days of cycles, 10 cards per numbered page (5 on phones) (`/?halaman=N`). */
export default function FeedPages({ page, pageCount, first, last, total, query, children }: FeedPagesProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Cards of any page reveal themselves as they scroll into view (ScrollReveal)
  const scope = useRef<HTMLDivElement>(null);

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
    <div ref={scope} className="flex scroll-mt-28 flex-col gap-8">
      {/* Announced on page changes; the numbered pages already show where you are */}
      <p aria-live="polite" className="sr-only">
        Menampilkan{' '}
        <strong>
          {first}–{last}
        </strong>{' '}
        dari <strong>{total}</strong> tren dalam 5 hari terakhir
      </p>

      <div className={`flex flex-col gap-8 transition-opacity md:gap-10 ${pending ? 'opacity-60' : ''}`}>{children}</div>

      <Pagination page={page} pageCount={pageCount} onPage={goToPage} label="Halaman Beranda" disabled={pending} />
    </div>
  );
}
