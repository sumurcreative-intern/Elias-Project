'use client';

import { CaretDown, Flag } from '@phosphor-icons/react';
import { priorityLabels, type ArchivePriority } from '@/lib/archive';

// A square-cornered outline keeps it visibly separate from the round status
// badge; the two are never merged into one chip (AR-4)
const box =
  'relative inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-txt-black focus-within:ring-offset-2';

const weights: Record<ArchivePriority, 'fill' | 'duotone' | 'regular'> = { high: 'fill', medium: 'duotone', low: 'regular' };

function label(priority: ArchivePriority | null) {
  return priority ? `Prioritas ${priorityLabels[priority]}` : 'Tanpa prioritas';
}

/**
 * Visible to everyone; editable only by account holders (AR-3). Guests get
 * `onLocked`, which opens the signup prompt instead of an error.
 */
export default function PriorityControl({
  priority,
  itemTitle,
  editable,
  onChange,
  onLocked,
}: {
  priority: ArchivePriority | null;
  itemTitle: string;
  editable: boolean;
  onChange: (priority: ArchivePriority | null) => void;
  onLocked: () => void;
}) {
  const tone = priority === 'high' ? 'border-primary-border text-primary' : 'border-disabled-surface text-neutral-700';
  const icon = <Flag size={16} weight={priority ? weights[priority] : 'regular'} aria-hidden />;

  if (!editable) {
    return (
      <button
        type="button"
        onClick={onLocked}
        aria-label={`${label(priority)}. Ubah prioritas: ${itemTitle}`}
        className={`${box} ${tone} hover:border-txt-black`}
      >
        {icon}
        {label(priority)}
      </button>
    );
  }

  return (
    <span className={`${box} ${tone} hover:border-txt-black`}>
      {icon}
      {label(priority)}
      <CaretDown size={14} aria-hidden />
      <select
        aria-label={`Prioritas: ${itemTitle}`}
        value={priority ?? ''}
        onChange={(e) => onChange((e.target.value || null) as ArchivePriority | null)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">Tanpa prioritas</option>
        {(Object.keys(priorityLabels) as ArchivePriority[]).map((value) => (
          <option key={value} value={value}>
            {priorityLabels[value]}
          </option>
        ))}
      </select>
    </span>
  );
}
