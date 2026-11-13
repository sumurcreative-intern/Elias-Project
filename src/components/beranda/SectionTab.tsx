import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * The red tab hanging off a Beranda card's top-left edge, its fold tucked
 * behind the card. Sits in a `relative` card with room above its content.
 * The body stretches with its label, as the Figma tab does.
 */
export default function SectionTab({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="absolute top-5 -left-2 flex max-w-[calc(100%+0.5rem)]">
      <Image src="/images/beranda/label-tab-left.svg" alt="" width={8} height={52} className="shrink-0" />
      <div className="relative flex h-[39px] min-w-0 items-center gap-2.5 pr-3 pl-[7px] text-txt-white">
        <Image src="/images/beranda/label-tab-body.svg" alt="" width={241} height={39} className="absolute inset-0 size-full" />
        <span className="relative shrink-0">{icon}</span>
        <div className="relative min-w-0 truncate font-mono text-md font-bold uppercase">{children}</div>
      </div>
    </div>
  );
}
