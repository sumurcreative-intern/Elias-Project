import type { ArchivedTrend, ArchivePriority, ArchiveStatus } from './archive';
import type { SourceId } from './insights/types';

export type ArchiveSort = 'newest' | 'oldest' | 'priority' | 'title';

export const sortLabels: Record<ArchiveSort, string> = {
  newest: 'Terbaru disimpan',
  oldest: 'Terlama disimpan',
  priority: 'Prioritas tertinggi',
  title: 'A–Z',
};

/** Empty strings mean "any". Every set filter must match (AND, AR-5). */
export type ArchiveFilters = {
  search: string;
  status: ArchiveStatus | '';
  category: string;
  source: SourceId | '';
  priority: ArchivePriority | 'none' | '';
  /** Saved-on range, ISO dates, inclusive */
  from: string;
  to: string;
};

export const noFilters: ArchiveFilters = {
  search: '',
  status: '',
  category: '',
  source: '',
  priority: '',
  from: '',
  to: '',
};

// TODO: items per page is Open Question 2.14
export const PAGE_SIZE = 6;

const priorityRank: Record<ArchivePriority, number> = { high: 3, medium: 2, low: 1 };

/** The calendar day an item was saved, in WIB. */
export function savedOn(item: ArchivedTrend): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(item.savedAt));
}

function matches(item: ArchivedTrend, filters: ArchiveFilters): boolean {
  const search = filters.search.trim().toLocaleLowerCase('id');
  if (search) {
    const haystack = [item.title, item.notes, item.category, ...item.tags].join(' ').toLocaleLowerCase('id');
    if (!haystack.includes(search)) return false;
  }
  if (filters.status && item.status !== filters.status) return false;
  if (filters.category && item.category !== filters.category) return false;
  if (filters.source && item.source !== filters.source) return false;
  if (filters.priority === 'none' && item.priority !== null) return false;
  if (filters.priority && filters.priority !== 'none' && item.priority !== filters.priority) return false;
  const day = savedOn(item);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;
  return true;
}

const newestFirst = (a: ArchivedTrend, b: ArchivedTrend) => b.savedAt.localeCompare(a.savedAt);

const comparators: Record<ArchiveSort, (a: ArchivedTrend, b: ArchivedTrend) => number> = {
  newest: newestFirst,
  oldest: (a, b) => a.savedAt.localeCompare(b.savedAt),
  // Unprioritised trends sink to the bottom; ties keep the default order
  priority: (a, b) =>
    (b.priority ? priorityRank[b.priority] : 0) - (a.priority ? priorityRank[a.priority] : 0) || newestFirst(a, b),
  title: (a, b) => a.title.localeCompare(b.title, 'id'),
};

export function queryArchive(items: ArchivedTrend[], filters: ArchiveFilters, sort: ArchiveSort, page: number) {
  const results = items.filter((item) => matches(item, filters)).sort(comparators[sort]);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * PAGE_SIZE;
  return {
    total: results.length,
    page: current,
    pageCount,
    /** 1-based, inclusive, for "Menampilkan X–Y dari Z tren" */
    first: results.length ? start + 1 : 0,
    last: Math.min(start + PAGE_SIZE, results.length),
    items: results.slice(start, start + PAGE_SIZE),
  };
}

/** Page numbers to show, with null for a gap: 1 … 4 5 6 … 12 */
export function pageList(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}

export function activeFilterCount(filters: ArchiveFilters): number {
  return (Object.keys(filters) as (keyof ArchiveFilters)[]).filter((key) => key !== 'search' && filters[key] !== '').length;
}
