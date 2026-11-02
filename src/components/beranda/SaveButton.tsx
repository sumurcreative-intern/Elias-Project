'use client';

import { BookmarkSimple } from '@phosphor-icons/react';
import { useArchive } from '@/lib/archive';
import type { Insight } from '@/lib/insights/types';

/** Saves the card to Arsip, or takes it back out. Updates in place, no reload (BR-3). */
export default function SaveButton({ insight }: { insight: Insight }) {
  const { items, save, remove } = useArchive();
  const saved = items.some((item) => item.insightId === insight.id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => (saved ? remove(insight.id) : save(insight))}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        saved
          ? 'border-txt-black bg-txt-black text-txt-white hover:bg-neutral-80'
          : 'border-disabled-surface text-txt-black hover:border-txt-black'
      }`}
    >
      <BookmarkSimple size={18} weight={saved ? 'fill' : 'regular'} aria-hidden />
      {saved ? 'Tersimpan di Arsip' : 'Simpan ke Arsip'}
    </button>
  );
}
