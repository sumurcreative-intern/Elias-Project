import Link from 'next/link';

export type FilterOption = { label: string; count: number; href: string; active: boolean };
/** "kategori", "waktu", "status": one row of options, each with its card count */
export type FilterRow = { by: string; options: FilterOption[] };

const option = (active: boolean) =>
  `flex items-center gap-2.5 border border-primary px-3 py-1.5 text-md transition-colors ${
    active ? 'bg-primary text-txt-white' : 'text-primary hover:bg-primary-tint'
  }`;
const count = (active: boolean) =>
  `min-w-[26px] px-1 text-center font-mono text-xs font-bold ${active ? 'bg-txt-white text-primary' : 'bg-primary text-txt-white'}`;

/**
 * Beranda's filters as links (`/?tampil=semua&waktu=hari-ini&status=eksekusi`),
 * so a view can be shared and the server renders it. Changing one starts
 * again at page 1.
 */
export default function FeedFilters({ rows }: { rows: FilterRow[] }) {
  return (
    <nav data-animate="page-item" aria-label="Filter feed" className="flex flex-col gap-3">
      {rows.map((row) => (
        // The description above, its options in a wrapping row below
        <div key={row.by} role="group" aria-labelledby={`filter-${row.by}`} className="flex flex-col gap-2">
          <p id={`filter-${row.by}`} className="font-mono text-xs font-bold text-disabled-content uppercase">
            Filter berdasarkan {row.by}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {row.options.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                scroll={false}
                aria-current={item.active ? 'true' : undefined}
                className={option(item.active)}
              >
                {item.label}
                <span className={count(item.active)}>{item.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
