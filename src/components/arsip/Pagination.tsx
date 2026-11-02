'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { pageList } from '@/lib/archiveQuery';

const cell = 'flex size-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors';

/** Numbered pages with the same structure on every breakpoint; no infinite scroll (AR-6). */
export default function Pagination({
  page,
  pageCount,
  onPage,
  label = 'Halaman Arsip',
  disabled = false,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  /** Accessible name of the nav, per page that uses it */
  label?: string;
  /** While the next page loads */
  disabled?: boolean;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label={label}
      aria-busy={disabled || undefined}
      className={`flex items-center justify-center gap-1 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className={`${cell} text-neutral-700 hover:bg-neutral-100 disabled:text-disabled-surface disabled:hover:bg-transparent`}
      >
        <CaretLeft size={18} />
      </button>
      {pageList(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className={`${cell} text-gray-600`}>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Halaman ${n}`}
            className={`${cell} ${n === page ? 'bg-txt-black text-txt-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === pageCount}
        aria-label="Halaman berikutnya"
        className={`${cell} text-neutral-700 hover:bg-neutral-100 disabled:text-disabled-surface disabled:hover:bg-transparent`}
      >
        <CaretRight size={18} />
      </button>
    </nav>
  );
}
