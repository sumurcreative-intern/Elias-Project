import type { BrandCategory } from '../brandCategories';
import type { StoredCard } from './store';
import type { Insight } from './types';

// Cards stored before the cycle tagged brand categories only carry the
// generator's single category. Only clear equivalents count: "News & Current
// Affairs" has no brand industry, so an untagged news card shows under "Semua" only
const fallbackFit: Record<string, BrandCategory[]> = {
  Automotive: ['automotive'],
  Beauty: ['beauty'],
  Education: ['education'],
  Entertainment: ['entertainment'],
  Fashion: ['fashion'],
  Finance: ['finance'],
  'Food & Beverage': ['food_beverage'],
  Gaming: ['entertainment', 'technology'],
  'Health & Wellness': ['health_wellness'],
  'Home & Living': ['home_living'],
  Music: ['entertainment', 'arts'],
  Parenting: ['parenting'],
  Sports: ['sports'],
  Technology: ['technology'],
  Travel: ['travel'],
};

/** Whether a brand of this category has an angle in the card's trend. */
export function fitsBrand(insight: Insight, category: BrandCategory): boolean {
  return (insight.brandCategories ?? fallbackFit[insight.category] ?? []).includes(category);
}

/**
 * Moves cards that reach the brand's target market up, but only among cards
 * of the same day and verdict: what to act on still comes first, and nothing
 * is hidden. Expects the feed order (./feed orderFeed); untagged cards don't move up.
 */
export function rankForAudience(cards: StoredCard[], market: string): StoredCard[] {
  const reaches = (card: StoredCard) => card.insight.audiences?.includes(market) ?? false;
  const ranked: StoredCard[] = [];
  for (let start = 0; start < cards.length; ) {
    const { cycleDate, insight } = cards[start];
    let end = start;
    while (end < cards.length && cards[end].cycleDate === cycleDate && cards[end].insight.verdict === insight.verdict) end++;
    const group = cards.slice(start, end);
    ranked.push(...group.filter(reaches), ...group.filter((card) => !reaches(card)));
    start = end;
  }
  return ranked;
}
