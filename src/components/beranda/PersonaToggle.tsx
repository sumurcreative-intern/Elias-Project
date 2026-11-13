'use client';

import { useId, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CaretRight } from '@phosphor-icons/react';
import { reducedMotion } from '../motion/inView';

gsap.registerPlugin(useGSAP);

/**
 * "Lihat persona kamu": what Beranda is tailored to, as bare values (Strategist,
 * Sage, Gen Z) beside the button. They slide out from behind it when opened
 * and back in when closed; the labels stay for screen readers only.
 */
export default function PersonaToggle({ context }: { context: [string, string][] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const list = useRef<HTMLUListElement>(null);
  const firstRender = useRef(true);

  useGSAP(
    () => {
      const element = list.current;
      if (!element) return;
      // Starts closed with nothing to animate
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      const items = gsap.utils.toArray<HTMLElement>('li', element);
      if (reducedMotion()) {
        gsap.set(element, { display: open ? 'flex' : 'none' });
        gsap.set(items, { clearProps: 'all' });
        return;
      }
      if (open) {
        gsap.set(element, { display: 'flex' });
        gsap.fromTo(
          items,
          { xPercent: -110, autoAlpha: 0 },
          // Overwrite kills a close still running, so its onComplete can't hide the list again
          { xPercent: 0, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out', overwrite: true },
        );
      } else {
        // Last in, first back behind the button
        gsap.to(items, {
          xPercent: -110,
          autoAlpha: 0,
          duration: 0.25,
          stagger: { each: 0.05, from: 'end' },
          ease: 'power2.in',
          overwrite: true,
          onComplete: () => gsap.set(element, { display: 'none' }),
        });
      }
    },
    { dependencies: [open] },
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        // Above the values, so they slide out from behind it
        className="group relative z-10 flex w-fit items-center bg-primary transition-colors hover:bg-ember"
      >
        <span className="px-3 font-mono text-xs font-bold text-txt-white uppercase">
          {open ? 'Tutup persona kamu' : 'Lihat persona kamu'}
        </span>
        <span className="flex items-center justify-center border-2 border-primary bg-txt-white p-1.5 text-primary group-hover:border-ember">
          <CaretRight size={16} aria-hidden className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <ul id={panelId} ref={list} aria-label="Persona kamu" className="hidden flex-wrap gap-2.5">
        {context.map(([label, value]) => (
          <li
            key={label}
            className="border border-primary bg-bg-white px-3 py-1.5 font-mono text-xs font-bold text-primary uppercase"
          >
            <span className="sr-only">{label}: </span>
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}
