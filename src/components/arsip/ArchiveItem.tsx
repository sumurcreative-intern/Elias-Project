'use client';

import { useState } from 'react';
import { NotePencil, Trash } from '@phosphor-icons/react';
import type { ArchivedTrend, ArchivePriority, ArchiveReaction, ArchiveStatus } from '@/lib/archive';
import { savedOn } from '@/lib/archiveQuery';
import { formatDate } from '@/lib/dates';
import { sources } from '@/lib/insights/types';
import NoteBox from './NoteBox';
import NoteEditor from './NoteEditor';
import PriorityControl from './PriorityControl';
import StatusControl from './StatusControl';

type ArchiveItemProps = {
  item: ArchivedTrend;
  canSetPriority: boolean;
  onStatus: (status: ArchiveStatus) => void;
  onPriority: (priority: ArchivePriority | null) => void;
  onNote: (notes: string, reaction: ArchiveReaction | null) => void;
  onRemove: () => void;
  onPriorityLocked: () => void;
};

const ghostButton =
  'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-neutral-100 hover:text-txt-black';

export default function ArchiveItem({
  item,
  canSetPriority,
  onStatus,
  onPriority,
  onNote,
  onRemove,
  onPriorityLocked,
}: ArchiveItemProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs text-gray-600">
          {sources[item.source].label} · {item.category} · Disimpan{' '}
          <time dateTime={item.savedAt}>{formatDate(savedOn(item), { month: 'short' })}</time>
        </p>
        <h2 className="text-lg font-semibold">{item.title}</h2>
        {item.tags.length > 0 && (
          <ul aria-label="Tag" className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag} className="rounded-sm bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusControl status={item.status} itemTitle={item.title} onChange={onStatus} />
        <PriorityControl
          priority={item.priority}
          itemTitle={item.title}
          editable={canSetPriority}
          onChange={onPriority}
          onLocked={onPriorityLocked}
        />
      </div>

      {(item.notes || item.reaction) && <NoteBox notes={item.notes} reaction={item.reaction ?? null} />}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        <button type="button" onClick={() => setEditingNotes(true)} className={ghostButton}>
          <NotePencil size={18} aria-hidden />
          {item.notes ? 'Ubah catatan' : 'Tambah catatan'}
        </button>
        {confirmRemove ? (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Konfirmasi hapus">
            <button type="button" onClick={() => setConfirmRemove(false)} className={ghostButton}>
              Batal
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md bg-error px-3 py-1.5 text-sm font-semibold text-bg-white transition hover:brightness-95"
            >
              Hapus dari Arsip
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className={`${ghostButton} ml-auto`}>
            <Trash size={18} aria-hidden />
            Hapus
          </button>
        )}
      </div>

      {editingNotes && <NoteEditor item={item} onSave={onNote} onClose={() => setEditingNotes(false)} />}
    </article>
  );
}
