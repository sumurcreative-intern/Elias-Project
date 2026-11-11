'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { TextB, ThumbsDown, ThumbsUp, X, type Icon } from '@phosphor-icons/react';
import type { ArchivedTrend, ArchiveReaction } from '@/lib/archive';

const reactions: { value: ArchiveReaction; label: string; icon: Icon; active: string }[] = [
  { value: 'like', label: 'Suka', icon: ThumbsUp, active: 'border-success-strong bg-success-surface text-success-strong' },
  { value: 'dislike', label: 'Tidak suka', icon: ThumbsDown, active: 'border-error bg-error/10 text-error' },
];

type NoteEditorProps = {
  item: ArchivedTrend;
  onSave: (notes: string, reaction: ArchiveReaction | null) => void;
  onClose: () => void;
};

/**
 * Popup for a saved trend's note and whether it turned out useful. Mount it
 * only while open: it starts from the saved values and opens itself.
 */
export default function NoteEditor({ item, onSave, onClose }: NoteEditorProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const notesId = useId();
  const hintId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(item.notes);
  const [reaction, setReaction] = useState<ArchiveReaction | null>(item.reaction ?? null);
  const dirty = draft.trim() !== item.notes || reaction !== (item.reaction ?? null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Wraps the selection in **, which NoteBox shows bold; unwraps it if already bold
  function toggleBold() {
    const field = textarea.current;
    if (!field) return;
    const { selectionStart: start, selectionEnd: end } = field;
    const before = draft.slice(0, start);
    const selected = draft.slice(start, end);
    const after = draft.slice(end);
    const wrapped = before.endsWith('**') && after.startsWith('**');
    const next = wrapped
      ? before.slice(0, -2) + selected + after.slice(2)
      : `${before}**${selected || 'teks tebal'}**${after}`;
    const from = wrapped ? start - 2 : start + 2;
    const to = from + (selected || (wrapped ? '' : 'teks tebal')).length;
    setDraft(next);
    // After React writes the new value, so the selection lands on it
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(from, to);
    });
  }

  function save() {
    if (dirty) onSave(draft.trim(), reaction);
    onClose();
  }

  return (
    <dialog
      ref={ref}
      // Escape closes the dialog natively; either way nothing is saved
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself. Ignored once
      // something is typed, so a stray click never throws away a note
      onClick={(e) => e.target === e.currentTarget && !dirty && onClose()}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-32px)] max-w-lg rounded-2xl bg-bg-white p-0 text-txt-black backdrop:bg-txt-black/40"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-5 p-5 md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="text-xl font-semibold">
              {item.notes ? 'Ubah catatan' : 'Tambah catatan'}
            </h2>
            <p className="line-clamp-2 text-sm text-neutral-600">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tanpa menyimpan"
            className="shrink-0 rounded-lg p-1 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-txt-black"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={notesId} className="text-sm font-medium text-gray-600">
              Catatan
            </label>
            <button
              type="button"
              onClick={toggleBold}
              aria-label="Tebalkan teks terpilih"
              title="Tebalkan (Ctrl+B)"
              className="rounded-md p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-txt-black"
            >
              <TextB size={18} weight="bold" aria-hidden />
            </button>
          </div>
          <textarea
            ref={textarea}
            id={notesId}
            aria-describedby={hintId}
            autoFocus
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              } else if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                toggleBold();
              }
            }}
            placeholder="Apa yang sudah dikerjakan, atau kenapa ditunda."
            className="w-full resize-y rounded-lg border border-disabled-surface px-3 py-2 text-md outline-none placeholder:text-disabled-content focus:border-primary"
          />
          <p id={hintId} className="text-xs text-gray-600">
            Tulis <code className="font-mono">**teks**</code> atau tekan <strong>Ctrl+B</strong> untuk menebalkan poin penting.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-gray-600">Tren ini berguna untuk brand kamu?</legend>
          <div className="flex gap-2">
            {reactions.map(({ value, label, icon: ReactionIcon, active }) => {
              const pressed = reaction === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={pressed}
                  // Pressing the chosen one again clears it
                  onClick={() => setReaction(pressed ? null : value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    pressed ? active : 'border-neutral-200 text-neutral-700 hover:border-txt-black hover:text-txt-black'
                  }`}
                >
                  <ReactionIcon size={18} weight={pressed ? 'fill' : 'regular'} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-neutral-100 hover:text-txt-black"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!dirty}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-bg-white transition hover:enabled:brightness-95 disabled:cursor-not-allowed disabled:bg-primary-subtle"
          >
            Simpan
          </button>
        </div>
      </form>
    </dialog>
  );
}
