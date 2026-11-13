'use client';

import { Fragment, useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { onceCued, reducedMotion, REVEAL_CUE } from './inView';

gsap.registerPlugin(useGSAP);

type MotionTextProps = {
  text: string;
  /**
   * "scramble": each letter rolls through the alphabet, then snaps to itself (page headings).
   * "type": words appear one by one behind a caret.
   * "fill": words start faded into the background and fill in reading order, scrubbed by scrolling
   */
  effect: 'scramble' | 'type' | 'fill';
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  id?: string;
  /** Seconds after the text scrolls into view, to sit behind a parent's entrance */
  delay?: number;
  /** Words within `text` to set apart, e.g. Beranda's "5 Trend Hari Ini" in red */
  accent?: { words: string; className: string };
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

// "fill" runs while the text's top travels from 90% to 55% of the viewport's height
const FILL_FROM = 0.9;
const FILL_TO = 0.55;

/**
 * Ties `--fill` (0 to 1) to the scroll position, which globals.css turns into
 * each word's opacity. Measured live rather than precomputed, since masonry
 * packing and an opening analysis move cards after mount. Only listens while
 * the text is near the viewport. Returns the cleanup.
 */
function scrubFill(element: HTMLElement): () => void {
  let frame = 0;
  const update = () => {
    frame = 0;
    const height = window.innerHeight;
    const progress = (height * FILL_FROM - element.getBoundingClientRect().top) / (height * (FILL_FROM - FILL_TO));
    element.style.setProperty('--fill', Math.min(1, Math.max(0, progress)).toFixed(3));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const listen = (on: boolean) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', schedule, { passive: true });
    window[method]('resize', schedule);
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      listen(entry.isIntersecting);
      // Leaving the view settles it at empty or full, however fast the scroll was
      schedule();
    },
    { rootMargin: '25% 0px' },
  );
  observer.observe(element);
  // Inside a card growing in (ScrollReveal), measure again once it has its full size
  const block = element.closest('[data-animate="scroll"]');
  let settle = 0;
  const onCue = () => {
    settle = window.setTimeout(schedule, 300);
  };
  block?.addEventListener(REVEAL_CUE, onCue);
  update();
  return () => {
    observer.disconnect();
    listen(false);
    cancelAnimationFrame(frame);
    clearTimeout(settle);
    block?.removeEventListener(REVEAL_CUE, onCue);
  };
}

/**
 * A heading that animates when it scrolls into view. React renders the words
 * and letters itself rather than SplitText rewriting the DOM, so the text can
 * change on a re-render (Beranda's headline does when the view switches) and
 * simply plays again. Screen readers get the plain text once.
 */
export default function MotionText({ text, effect, as: Tag = 'span', className, id, delay = 0, accent }: MotionTextProps) {
  const root = useRef<HTMLElement>(null);
  const words = text.split(/\s+/).filter(Boolean);
  const accentWords = accent?.words.split(/\s+/).filter(Boolean) ?? [];
  const accentAt = accentWords.length
    ? words.findIndex((_, i) => accentWords.every((word, j) => words[i + j] === word))
    : -1;
  const accented = (i: number) => accentAt >= 0 && i >= accentAt && i < accentAt + accentWords.length;

  useGSAP(
    (_, contextSafe) => {
      const element = root.current;
      if (!element || reducedMotion()) return;
      if (effect === 'fill') return scrubFill(element);

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
    <Tag
      ref={root as never}
      id={id}
      data-split={effect}
      className={className}
      style={effect === 'fill' ? ({ '--words': words.length } as CSSProperties) : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, i) => (
          <Fragment key={i}>
            <span
              data-word
              className={`relative inline-block ${accented(i) ? accent?.className : ''}`}
              style={effect === 'fill' ? ({ '--i': i } as CSSProperties) : undefined}
            >
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
