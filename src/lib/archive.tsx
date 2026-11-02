'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { Insight, SourceId } from './insights/types';

// Saved trends live on this device for now (AR-8). Account holders move to the
// database, keyed to brand_profile_id, with the data model work (docs/MVP.md,
// MVP 4); callers only use useArchive(), so that swap stays local to this file.
//
// Each owner gets its own storage key, so a guest and every account on a shared
// device keep separate archives. Whether guest saves move into a new account is
// Open Question 2.6, so nothing is migrated.

export type ArchiveStatus = 'not_started' | 'in_progress' | 'executed';
export type ArchivePriority = 'low' | 'medium' | 'high';

export const statusLabels: Record<ArchiveStatus, string> = {
  not_started: 'Belum Dieksekusi',
  in_progress: 'Sedang Dikerjakan',
  executed: 'Sudah Dieksekusi',
};

export const priorityLabels: Record<ArchivePriority, string> = {
  high: 'Tinggi',
  medium: 'Menengah',
  low: 'Rendah',
};

export type ArchivedTrend = {
  insightId: string;
  title: string;
  source: SourceId;
  category: string;
  tags: string[];
  /** When the source observed the movement */
  observedOn: string;
  savedAt: string;
  status: ArchiveStatus;
  /** When the status last changed; feeds the execution-rate metric (Ch. 5) */
  statusChangedAt: string;
  /** Account holders only (AR-3); null until set */
  priority: ArchivePriority | null;
  notes: string;
};

const GUEST_KEY = 'elias.archive.v1.guest';
const listeners = new Set<() => void>();
const empty: ArchivedTrend[] = [];
// Parsed once per change so useSyncExternalStore gets a stable snapshot
const cache = new Map<string, { raw: string | null; items: ArchivedTrend[] }>();

function read(key: string): ArchivedTrend[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // Storage blocked (private window, disabled site data): fall back to memory
    return cache.get(key)?.items ?? empty;
  }
  const cached = cache.get(key);
  if (cached && raw === cached.raw) return cached.items;
  let items = empty;
  try {
    items = raw ? (JSON.parse(raw) as ArchivedTrend[]) : empty;
  } catch {
    // Corrupt entry; start over rather than crash the page
  }
  cache.set(key, { raw, items });
  return items;
}

function write(key: string, items: ArchivedTrend[]) {
  const raw = JSON.stringify(items);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // Not persisted; the session still reflects the change
  }
  cache.set(key, { raw, items });
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other tabs in step
  const onStorage = () => listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

type Owner = { key: string; isAccount: boolean };
const OwnerContext = createContext<Owner>({ key: GUEST_KEY, isAccount: false });

/** Scopes every archive read and write below it to one owner. */
export function ArchiveProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const owner = useMemo(
    () => (userId ? { key: `elias.archive.v1.user.${userId}`, isAccount: true } : { key: GUEST_KEY, isAccount: false }),
    [userId],
  );
  return <OwnerContext value={owner}>{children}</OwnerContext>;
}

export function useArchive() {
  const { key, isAccount } = useContext(OwnerContext);
  const items = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => empty,
  );

  const update = useCallback(
    (insightId: string, change: (item: ArchivedTrend) => ArchivedTrend) =>
      write(
        key,
        read(key).map((item) => (item.insightId === insightId ? change(item) : item)),
      ),
    [key],
  );

  return {
    items,
    /** Priority is gated to account holders (AR-3) */
    canSetPriority: isAccount,

    /** Saves a card with its source, tags and date pre-filled (BR-3), optionally with a first note. */
    save: useCallback(
      (insight: Insight, notes = '') => {
        const current = read(key);
        if (current.some((item) => item.insightId === insight.id)) return;
        const now = new Date().toISOString();
        write(key, [
          {
            insightId: insight.id,
            title: insight.signal,
            source: insight.source,
            category: insight.category,
            tags: insight.tags,
            observedOn: insight.observedOn,
            savedAt: now,
            status: 'not_started',
            statusChangedAt: now,
            priority: null,
            notes,
          },
          ...current,
        ]);
      },
      [key],
    ),

    remove: useCallback((insightId: string) => write(key, read(key).filter((item) => item.insightId !== insightId)), [key]),

    setStatus: useCallback(
      (insightId: string, status: ArchiveStatus) =>
        update(insightId, (item) => ({ ...item, status, statusChangedAt: new Date().toISOString() })),
      [update],
    ),

    setPriority: useCallback(
      (insightId: string, priority: ArchivePriority | null) => {
        if (isAccount) update(insightId, (item) => ({ ...item, priority }));
      },
      [isAccount, update],
    ),

    setNotes: useCallback(
      (insightId: string, notes: string) => update(insightId, (item) => ({ ...item, notes })),
      [update],
    ),

    /** Prototype only: adds sample entries that aren't already saved */
    seed: useCallback(
      (samples: ArchivedTrend[]) => {
        const current = read(key);
        const ids = new Set(current.map((item) => item.insightId));
        const fresh = samples
          .filter((sample) => !ids.has(sample.insightId))
          .map((sample) => (isAccount ? sample : { ...sample, priority: null }));
        write(key, [...current, ...fresh]);
      },
      [isAccount, key],
    ),
  };
}
