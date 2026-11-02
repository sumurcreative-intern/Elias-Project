import { Eye, Lightning, Prohibit } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { Verdict } from '@/lib/insights/types';

// Icon shape carries the meaning as much as colour does (AR-2)
const verdicts: Record<Verdict, { label: string; icon: Icon; className: string }> = {
  act: { label: 'Eksekusi', icon: Lightning, className: 'bg-primary-surface text-primary' },
  watch: { label: 'Pantau', icon: Eye, className: 'bg-warning-surface text-warning' },
  skip: { label: 'Lewati', icon: Prohibit, className: 'bg-neutral-100 text-neutral-600' },
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { label, icon: IconComponent, className } = verdicts[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${className}`}>
      <IconComponent size={16} weight="bold" aria-hidden />
      {label}
    </span>
  );
}
