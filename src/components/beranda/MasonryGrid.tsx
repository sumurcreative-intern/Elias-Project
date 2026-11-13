'use client';

import { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Grid rows this tall; each card spans as many as its height needs
const ROW_PX = 2;

/**
 * Pinterest-style grid: two columns when both fit at 22rem or wider, else
 * one, each card packed under the one above instead of waiting for its
 * row's tallest card.
 *
 * Cards stay in DOM order (row by row, so ranking and tab order hold) and
 * never move between parents, so an open Elias analysis survives a resize.
 * A card that grows, like one expanding its analysis, re-measures itself.
 */
export default function MasonryGrid({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null);
  // Until measured, a plain grid: also what reduced motion sees before hydration
  const [measured, setMeasured] = useState(false);

  // Runs after every render, so cards from a new page are measured too.
  // Before paint, and cards stay hidden until ScrollReveal shows them, so the
  // switch from plain grid to packed grid is never seen
  useLayoutEffect(() => {
    const items = Array.from(grid.current?.children ?? []) as HTMLElement[];
    const fit = (item: HTMLElement) => {
      item.style.gridRowEnd = `span ${Math.max(1, Math.ceil(item.getBoundingClientRect().height / ROW_PX))}`;
    };
    // Only height changes matter; a span change never resizes the item itself (self-start)
    const observer = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target as HTMLElement)));
    items.forEach((item) => {
      fit(item);
      observer.observe(item);
    });
    setMeasured(true);
    return () => observer.disconnect();
  });

  return (
    <div
      ref={grid}
      // Vertical spacing lives in each item's padding, so the 2px rows add no gap of their own
      // Columns at least 22rem and at least half the row, so never more than two;
      // one column once two would be narrower than 22rem
      className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(22rem,calc((100%-var(--gap))/2))),1fr))] gap-x-(--gap) -mb-(--gap) [--gap:1rem] md:[--gap:1.5rem] laptop:[--gap:50px] ${
        measured ? 'auto-rows-[2px]' : ''
      }`}
    >
      {Children.map(children, (child) => (
        <div className="self-start pb-(--gap)">{child}</div>
      ))}
    </div>
  );
}
