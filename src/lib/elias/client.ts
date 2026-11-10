'use client';

import { insightCacheKey, type InsightRequest, type InsightResponse } from './types';

// Client half of the free-tier safeguards: an answer already fetched in this
// tab session is never requested again, and a double click shares one request.

type Success = Extract<InsightResponse, { ok: true }>;

// v4: answers grounded on the trend's details; v3 entries were generic
const STORAGE_PREFIX = 'elias.insight.v4.';
const memory = new Map<string, Success>();
const inFlight = new Map<string, Promise<InsightResponse>>();

/** A previously fetched answer, from memory or this tab's session storage. */
export function cachedInsight(request: InsightRequest): Success | null {
  const key = insightCacheKey(request);
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Success;
    memory.set(key, stored);
    return stored;
  } catch {
    // Storage blocked or corrupt: treat as a miss
    return null;
  }
}

export function requestInsight(request: InsightRequest): Promise<InsightResponse> {
  const cached = cachedInsight(request);
  if (cached) return Promise.resolve({ ...cached, cached: true });

  const key = insightCacheKey(request);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetch('/api/elias/insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
    .then(async (response): Promise<InsightResponse> => {
      try {
        return (await response.json()) as InsightResponse;
      } catch {
        return { ok: false, error: { code: 'upstream', message: 'Server tidak merespons dengan benar. Coba lagi.' } };
      }
    })
    .catch(
      (): InsightResponse => ({
        ok: false,
        error: { code: 'upstream', message: 'Koneksi terputus. Periksa jaringan lalu coba lagi.' },
      }),
    )
    .then((result) => {
      if (result.ok) {
        memory.set(key, result);
        try {
          sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(result));
        } catch {
          // Memory cache still covers this tab
        }
      }
      return result;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}
