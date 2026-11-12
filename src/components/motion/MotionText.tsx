'use client';

import { Fragment, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { onceCued, reducedMotion } from './inView';

gsap.registerPlugin(useGSAP);

type MotionTextProps = {
  text: string;
  /** "scramble": each letter rolls through the alphabet, then snaps to itself. "type": words appear one by one behind a caret */
  effect: 'scramble' | 'type';
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  id?: string;
  /** Seconds after the text scrolls into view, to sit behind a parent's entrance */
  delay?: number;
};

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = UPPER.toLowerCase();
const DIGITS = '0123456789';

/** The glyphs a letter rolls through, matching its case; punctuation just appears */
function rollFor(char: string): string | null {
  if (/\d/.test(char)) return DIGITS;
  if (char.toLowerCase() === char.toUpperCase()) return null;
  return char === char.toUpperCase() ? UPPER : LOWER;
}

/**
 * A heading that animates when it scrolls into view. React renders the words
 * and letters itself rather than SplitText rewriting the DOM, so the text can
 * change on a re-render (Beranda's headline does when the view switches) and
 * simply plays again. Screen readers get the plain text once.
 */
export default function MotionText({ text, effect, as: Tag = 'span', className, id, delay = 0 }: MotionTextProps) {
  const root = useRef<HTMLElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useGSAP(
    (_, contextSafe) => {
      const element = root.current;
      if (!element || reducedMotion()) return;

      if (effect === 'scramble') {
        const chars = gsap.utils.toArray<HTMLElement>('[data-char]', element);
        // The rolls write into React's own text nodes, so a re-render still finds them
        const nodes = chars.map((char) => char.firstChild as Text);
        const finals = nodes.map((node) => node.data);

        const play = contextSafe!(() => {
          const timeline = gsap.timeline({ delay });
          chars.forEach((char, i) => {
            const at = i * 0.03;
            timeline.set(char, { autoAlpha: 1 }, at);
            const pool = rollFor(finals[i]);
            if (!pool) return;
            const roll = { step: 0 };
            let shown = -1;
            timeline.to(
              roll,
              {
                step: 7,
                duration: 0.3,
                ease: 'none',
                // Locked to the real letter's width, so the line holds still while it rolls
                onStart: () => gsap.set(char, { display: 'inline-block', width: char.offsetWidth, textAlign: 'center' }),
                onUpdate: () => {
                  const step = Math.floor(roll.step);
                  if (step === shown) return;
                  shown = step;
                  nodes[i].data = pool[Math.floor(Math.random() * pool.length)];
                },
                onComplete: () => {
                  nodes[i].data = finals[i];
                  gsap.set(char, { clearProps: 'display,width,textAlign' });
                },
              },
              at,
            );
          });
        });

        const stop = onceCued(element, play);
        return () => {
          stop();
          nodes.forEach((node, i) => (node.data = finals[i]));
        };
      }

      // Typing: each word lands after a pause that grows with its length,
      // and the caret sits on the newest word until it blinks out
      const targets = gsap.utils.toArray<HTMLElement>('[data-word]', element);
      const play = contextSafe!(() => {
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

      return onceCued(element, play);
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
              {effect === 'scramble'
                ? Array.from(word).map((char, j) => (
                    <span key={j} data-char>
                      {char}
                    </span>
                  ))
                : word}
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
