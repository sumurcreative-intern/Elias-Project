import Image from 'next/image';
import { Eye, Lightning, Prohibit } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { Verdict } from '@/lib/insights/types';

// Icon shape carries the meaning, since every tab shares the same red (AR-2)
export const verdicts: Record<Verdict, { label: string; icon: Icon }> = {
  act: { label: 'Eksekusi', icon: Lightning },
  watch: { label: 'Pantau', icon: Eye },
  skip: { label: 'Lewati', icon: Prohibit },
};

/** The card's verdict as a red tab, its fold tucked behind the card's edge. */
export default function VerdictTab({ verdict }: { verdict: Verdict }) {
  const { label, icon: IconComponent } = verdicts[verdict];
  return (
    <div className="relative h-9 w-[108px] shrink-0">
      <Image src="/images/beranda/verdict-tab.svg" alt="" width={108} height={36} className="absolute inset-0" />
      <span className="relative flex h-[27px] items-center gap-1.5 pl-3 font-mono text-xs font-bold text-txt-white uppercase">
        <IconComponent size={16} weight="fill" aria-hidden />
        {label}
      </span>
    </div>
  );
}
