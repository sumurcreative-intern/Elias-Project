'use client';

import { Fragment, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ThumbsDown, ThumbsUp } from '@phosphor-icons/react';
import type { ArchiveReaction } from '@/lib/archive';

const reactionLabels: Record<ArchiveReaction, { label: string; icon: typeof ThumbsUp; className: string }> = {
  like: { label: 'Disukai', icon: ThumbsUp, className: 'text-success-strong' },
  dislike: { label: 'Tidak disukai', icon: ThumbsDown, className: 'text-error' },
};

// "Label: value" and "Heading:" lines, like the ones executionBrief writes.
// Short labels only, so an ordinary sentence with a colon stays plain
const LABEL = /^([^:\n]{1,40}):(\s|$)/;

/** `**text**` typed in the editor, shown bold; the markers themselves are hidden. */
function inline(text: string, key: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={`${key}-${i}`}>{part}</strong> : part));
}

/**
 * Bold where a note is scanned: labels, the brief's title, and its decision
 * headline (the first line after the Tren/Keputusan/Peran header). The saved
 * text stays plain, so search and "Salin Brief" read the same as before.
 */
function formatNote(notes: string): ReactNode[] {
  const lines = notes.split('\n');
  return lines.map((line, i) => {
    const key = String(i);
    const previous = lines[i - 2];
    const isTitle = /^MAKE IT TODAY\b/.test(line);
    const isHeadline = line !== '' && lines[i - 1] === '' && previous?.startsWith('Peran:');
    const label = !isTitle && !line.includes('://') ? LABEL.exec(line) : null;
    const content = isTitle || isHeadline ? (
      <strong key={key}>{line}</strong>
    ) : label ? (
      <Fragment key={key}>
        <strong>{label[1]}:</strong>
        {inline(line.slice(label[1].length + 1), key)}
      </Fragment>
    ) : (
      <Fragment key={key}>{inline(line, key)}</Fragment>
    );
    return i < lines.length - 1 ? <Fragment key={`${key}-line`}>{content}{'\n'}</Fragment> : content;
  });
}

/**
 * A saved trend's note and reaction, read back on its Arsip card. Keeps the
 * note's line breaks and folds long notes to four lines.
 */
export default function NoteBox({ notes, reaction }: { notes: string; reaction: ArchiveReaction | null }) {
  const textId = useId();
  const text = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measured while folded, and again when the card's width changes
  useLayoutEffect(() => {
    const element = text.current;
    if (!element || expanded) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [notes, expanded]);

  const shown = reaction ? reactionLabels[reaction] : null;

  return (
    <section aria-label="Catatan" className="flex flex-col gap-2 rounded-xl bg-neutral-100 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] leading-4 font-bold tracking-wide text-gray-600 uppercase">Catatan</h3>
        {shown && (
          <p className={`flex items-center gap-1 text-xs font-semibold ${shown.className}`}>
            <shown.icon size={14} weight="fill" aria-hidden />
            {shown.label}
          </p>
        )}
      </div>

      {notes && (
        <>
          <p
            id={textId}
            ref={text}
            className={`text-md leading-relaxed [&_strong]:text-txt-black break-words whitespace-pre-line text-neutral-80 ${expanded ? '' : 'line-clamp-4'}`}
          >
            {formatNote(notes)}
          </p>
          {(overflows || expanded) && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={textId}
              onClick={() => setExpanded(!expanded)}
              className="self-start text-sm font-semibold text-txt-black underline decoration-neutral-300 underline-offset-2 hover:decoration-current"
            >
              {expanded ? 'Ringkas' : 'Baca selengkapnya'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
