'use client';

import { CaretDown, CheckCircle, CircleDashed, CircleHalf, type Icon } from '@phosphor-icons/react';
import { statusLabels, type ArchiveStatus } from '@/lib/archive';

// Each status has its own icon shape, so the badge reads the same under
// colour-blind simulation (AR-2)
export const statusStyles: Record<ArchiveStatus, { icon: Icon; className: string }> = {
  not_started: { icon: CircleDashed, className: 'bg-neutral-100 text-neutral-700' },
  in_progress: { icon: CircleHalf, className: 'bg-warning-surface text-warning' },
  executed: { icon: CheckCircle, className: 'bg-success-surface text-success-strong' },
};

export function StatusIcon({ status, size = 16 }: { status: ArchiveStatus; size?: number }) {
  const IconComponent = statusStyles[status].icon;
  return <IconComponent size={size} weight="bold" aria-hidden />;
}

/**
 * Status badge that is also its own editor: a native select laid over it, so
 * it changes in place without opening a detail view (AR-2).
 */
export default function StatusControl({
  status,
  itemTitle,
  onChange,
}: {
  status: ArchiveStatus;
  itemTitle: string;
  onChange: (status: ArchiveStatus) => void;
}) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition focus-within:ring-2 focus-within:ring-txt-black focus-within:ring-offset-2 hover:brightness-95 ${statusStyles[status].className}`}
    >
      <StatusIcon status={status} />
      {statusLabels[status]}
      <CaretDown size={14} aria-hidden />
      <select
        aria-label={`Status: ${itemTitle}`}
        value={status}
        onChange={(e) => onChange(e.target.value as ArchiveStatus)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {(Object.keys(statusLabels) as ArchiveStatus[]).map((value) => (
          <option key={value} value={value}>
            {statusLabels[value]}
          </option>
        ))}
      </select>
    </span>
  );
}
