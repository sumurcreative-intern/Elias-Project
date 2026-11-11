'use client';

import { Fragment, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { onceInView, reducedMotion } from './inView';

gsap.registerPlugin(useGSAP);

type MotionTextProps = {
  text: string;
  /** "blur": words slide in out of a motion blur. "type": words appear one by one behind a caret */
  effect: 'blur' | 'type';
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  id?: string;
  /** Seconds after the text scrolls into view, to sit behind a parent's entrance */
  delay?: number;
};

/**
 * A heading that animates word by word when it scrolls into view. React
 * renders the words itself rather than SplitText rewriting the DOM, so the
 * text can change on a re-render (Beranda's headline does when the view
 * switches) and simply plays again. Screen readers get the plain text once.
 */
export default function MotionText({ text, effect, as: Tag = 'span', className, id, delay = 0 }: MotionTextProps) {
  const root = useRef<HTMLElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useGSAP(
    (_, contextSafe) => {
      const element = root.current;
      if (!element || reducedMotion()) return;
      const targets = gsap.utils.toArray<HTMLElement>('[data-word]', element);

      const play = contextSafe!(() => {
        if (effect === 'blur') {
          gsap.fromTo(
            targets,
            { autoAlpha: 0, x: 18, filter: 'blur(10px)' },
            { autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.06, delay, clearProps: 'filter' },
          );
          return;
        }
        // Typing: each word lands after a pause that grows with its length,
        // and the caret sits on the newest word until it blinks out
        const timeline = gsap.timeline({ delay });
        let at = 0;
        let previous: HTMLElement | null = null;
        for (const word of targets) {
          const last = previous;
          timeline.set(word, { autoAlpha: 1 }, at).call(() => {
            last?.removeAttribute('data-caret');
            word.setAttribute('data-caret', '');
          }, undefined, at);
          at += 0.05 + (word.textContent?.length ?? 1) * 0.03;
          previous = word;
        }
        timeline.call(() => previous?.removeAttribute('data-caret'), undefined, at + 0.9);
      });

      return onceInView(element, play);
    },
    { scope: root, dependencies: [text], revertOnUpdate: true },
  );

  return (
    <Tag ref={root as never} id={id} data-split={effect} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <Fragment key={i}>
            <span data-word className="relative inline-block">
              {word}
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
