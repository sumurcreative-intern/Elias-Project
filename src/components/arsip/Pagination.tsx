'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { pageList } from '@/lib/archiveQuery';

const cell = 'flex h-[34px] items-center justify-center rounded-[4px] text-xs font-medium transition-colors';
const arrow = `${cell} w-8 text-primary hover:bg-primary-tint disabled:text-primary-subtle disabled:hover:bg-transparent`;

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
        className={arrow}
      >
        <CaretLeft size={16} />
      </button>
      {pageList(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className={`${cell} w-[34px] text-primary`}>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Halaman ${n}`}
            className={`${cell} w-[34px] ${n === page ? 'bg-primary text-bg-white' : 'text-primary hover:bg-primary-tint'}`}
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
        className={arrow}
      >
        <CaretRight size={16} />
      </button>
    </nav>
  );
}
