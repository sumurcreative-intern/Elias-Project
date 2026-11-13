'use client';

import { BookmarkSimple, NotePencil } from '@phosphor-icons/react';
import { useArchive } from '@/lib/archive';
import { useBrief } from '@/lib/elias/briefs';
import type { Insight } from '@/lib/insights/types';

/**
 * The card's only way into Arsip. Saves the card, with Elias's brief as its
 * note once the card has been analysed; a card saved before its analysis can
 * take the brief afterwards. Saved and up to date, it takes the card back
 * out. Updates in place, no reload (BR-3).
 */
export default function SaveButton({ insight }: { insight: Insight }) {
  const { items, save, remove, setNotes } = useArchive();
  const brief = useBrief(insight.id);
  const saved = items.find((item) => item.insightId === insight.id);
  const briefMissing = Boolean(saved && brief && !saved.notes.includes(brief));

  function onClick() {
    if (!saved) save(insight, brief ?? '');
    else if (briefMissing && brief) setNotes(insight.id, saved.notes ? `${saved.notes}\n\n${brief}` : brief);
    else remove(insight.id);
  }

  return (
    <button
      type="button"
      aria-pressed={Boolean(saved) && !briefMissing}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[4px] border px-3 py-2 text-xs font-medium transition-colors ${
        saved && !briefMissing
          ? 'border-primary bg-primary text-bg-white hover:border-ember hover:bg-ember'
          : 'border-primary text-primary hover:bg-primary-tint'
      }`}
    >
      {briefMissing ? (
        <NotePencil size={16} aria-hidden />
      ) : (
        <BookmarkSimple size={16} weight={saved ? 'fill' : 'regular'} aria-hidden />
      )}
      {!saved
        ? 'Simpan ke Arsip'
        : briefMissing
          ? 'Tambahkan brief ke Arsip'
          : 'Tersimpan di Arsip'}
    </button>
  );
}
