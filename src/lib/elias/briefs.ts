'use client';

import { useSyncExternalStore } from 'react';

// The latest Elias brief per card, so the card's one Save to Archive button
// can store it without the analysis panel having a save button of its own.
// Page memory only: the analysis itself is cached in client.ts.

const briefs = new Map<string, string>();
const listeners = new Set<() => void>();

export function setBrief(insightId: string, brief: string) {
  if (briefs.get(insightId) === brief) return;
  briefs.set(insightId, brief);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The card's brief once Elias has analysed it, else null. */
export function useBrief(insightId: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => briefs.get(insightId) ?? null,
    () => null,
  );
}
