'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

type OtpInputProps = {
  length: number;
  value: string[];
  onChange: (value: string[]) => void;
};

/** One box per digit; typing advances, Backspace steps back, pasting fills every box. */
export default function OtpInput({ length, value, onChange }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focus(index: number) {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  }

  function setDigits(start: number, digits: string) {
    const next = [...value];
    digits
      .slice(0, length - start)
      .split('')
      .forEach((digit, offset) => {
        next[start + offset] = digit;
      });
    onChange(next);
    focus(start + digits.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index]) {
      event.preventDefault();
      const next = [...value];
      next[index - 1] = '';
      onChange(next);
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      focus(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    event.preventDefault();
    setDigits(index, digits);
  }

  return (
    <div data-animate="form-item" role="group" aria-label="Kode verifikasi" className="flex justify-between gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ''}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            if (digits) {
              setDigits(i, digits);
            } else {
              const next = [...value];
              next[i] = '';
              onChange(next);
            }
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          className="aspect-square min-w-0 max-w-[60px] flex-1 rounded-xl border border-disabled-surface bg-transparent text-center text-2xl leading-8 font-bold text-txt-black caret-disabled-content outline-none transition-colors focus:border-primary md:max-w-[86px] md:text-display-md"
        />
      ))}
    </div>
  );
}
