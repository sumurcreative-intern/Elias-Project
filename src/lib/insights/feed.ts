import type { StoredCard } from './store';
import type { Insight } from './types';

/** Cards per numbered page on Beranda. */
export const feedPageSize = 10;

// Within a day: what to do first, then what to watch, then what to skip
const verdictOrder: Record<Insight['verdict'], number> = { act: 0, watch: 1, skip: 2 };

/** Newest day first; within a day by verdict, keeping the generator's order. */
export function orderFeed(cards: StoredCard[]): StoredCard[] {
  return [...cards].sort(
    (a, b) =>
      b.cycleDate.localeCompare(a.cycleDate) || verdictOrder[a.insight.verdict] - verdictOrder[b.insight.verdict],
  );
}

export type FeedPage = {
  /** 1-based page number, clamped to the pages that exist */
  page: number;
  count: number;
  items: StoredCard[];
  /** 1-based positions of the first and last card, for "Menampilkan X–Y dari Z" */
  first: number;
  last: number;
};

/**
 * One page of the stored cycles. Every page is a slice of cycles already
 * generated (BR-1): paging never fetches new trends.
 */
export function feedPage(cards: StoredCard[], requested: string | undefined): FeedPage {
  const count = Math.max(1, Math.ceil(cards.length / feedPageSize));
  const parsed = Number.parseInt(requested ?? '', 10);
  const page = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), count);
  const start = (page - 1) * feedPageSize;
  const items = cards.slice(start, start + feedPageSize);
  return { page, count, items, first: start + 1, last: start + items.length };
}

/** Consecutive cards of the same day, for the day headings inside a page. */
export function groupByDay(cards: StoredCard[]): { date: string; cards: StoredCard[] }[] {
  const groups: { date: string; cards: StoredCard[] }[] = [];
  for (const card of cards) {
    const last = groups.at(-1);
    if (last?.date === card.cycleDate) last.cards.push(card);
    else groups.push({ date: card.cycleDate, cards: [card] });
  }
  return groups;
}
