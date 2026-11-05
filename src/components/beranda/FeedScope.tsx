import Link from 'next/link';

type FeedScopeProps = {
  /** "Beauty": the user's brand category */
  brandLabel: string;
  brandCount: number;
  allCount: number;
  /** Which view is on screen; "all" also when nothing fits the brand */
  active: 'brand' | 'all';
  /** Query kept across views, like the prototype's quiet-day switch */
  query: string;
};

/** "Untuk Beauty (4) · Semua (18)": Beranda opens on the brand's cards (`/?tampil=semua` for all). */
export default function FeedScope({ brandLabel, brandCount, allCount, active, query }: FeedScopeProps) {
  // Switching views starts again at page 1
  const href = (all: boolean) => {
    const params = new URLSearchParams(query);
    if (all) params.set('tampil', 'semua');
    const search = params.toString();
    return search ? `/?${search}` : '/';
  };
  const chip = (current: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
      current ? 'border-txt-black bg-txt-black text-txt-white' : 'border-neutral-200 text-txt-black hover:border-txt-black'
    }`;

  return (
    <nav data-animate="page-item" aria-label="Tampilan feed" className="flex flex-wrap gap-2">
      <Link
        href={href(false)}
        scroll={false}
        aria-current={active === 'brand' ? 'page' : undefined}
        className={chip(active === 'brand')}
      >
        Untuk {brandLabel} ({brandCount})
      </Link>
      <Link
        href={href(true)}
        scroll={false}
        aria-current={active === 'all' ? 'page' : undefined}
        className={chip(active === 'all')}
      >
        Semua ({allCount})
      </Link>
    </nav>
  );
}
