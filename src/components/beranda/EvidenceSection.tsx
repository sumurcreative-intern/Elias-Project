'use client';

import { useId, useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';

/**
 * The card's "Berdasarkan" sources, with a caret beside the heading that
 * folds them away and back. Folds like the Elias analysis: the row animates
 * from 1fr to 0fr, and goes inert while closed so focus skips the links.
 */
export default function EvidenceSection({ labelClassName, children }: { labelClassName: string; children: ReactNode }) {
  const [shown, setShown] = useState(true);
  const listId = useId();

  return (
    <section data-reveal className="flex flex-col" aria-label="Sumber">
      <div className="flex items-center gap-0.5">
        <h3 className={labelClassName}>Berdasarkan</h3>
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-expanded={shown}
          aria-controls={listId}
          aria-label={shown ? 'Sembunyikan sumber' : 'Tampilkan sumber'}
          className="-my-1 flex size-6 items-center justify-center rounded-[4px] text-disabled-content transition-colors hover:text-primary"
        >
          <CaretDown size={16} aria-hidden className={`transition-transform duration-300 ${shown ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div
        id={listId}
        inert={!shown}
        className={`grid transition-[grid-template-rows,margin] duration-300 ease-out motion-reduce:transition-none ${
          shown ? 'mt-1.5 grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
