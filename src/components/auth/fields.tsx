'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  LockSimple,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';

const inputBox =
  'flex cursor-text items-center gap-2.5 border border-disabled-surface px-4 py-3 transition-colors focus-within:border-primary md:p-4';
const input =
  'min-w-0 flex-1 bg-transparent text-md text-txt-black outline-none placeholder:text-disabled-content md:text-lg';

/** Phosphor icon followed by the 1px separator from the design's input frame. */
function InputIcon({ icon: IconComponent }: { icon: Icon }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-disabled-content" aria-hidden>
      <IconComponent size={18} weight="light" />
      <span className="h-[14.5px] w-px rounded-full bg-current" />
    </span>
  );
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Collapsed slot for whichever of label / hint is currently swapped out. */
const collapsed = 'invisible h-0 opacity-0';

function FieldHint({
  id,
  shown = true,
  ref,
  children,
}: {
  id: string;
  shown?: boolean;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div ref={ref} aria-hidden={!shown} className={`overflow-hidden ${shown ? '' : collapsed}`}>
      <p id={id} className="flex gap-1 pt-1 text-xs text-disabled-content">
        {children}
      </p>
    </div>
  );
}

/**
 * Visible label for a filled field. A filled field shows this above the box
 * instead of the hint below it; both slots are 22px, so the fields below never move.
 * Screen readers already get the label from the field itself.
 */
function FieldLabel({ shown, ref, children }: { shown: boolean; ref?: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div ref={ref} aria-hidden className={`overflow-hidden ${shown ? '' : collapsed}`}>
      <p className="pb-1 text-xs font-medium text-disabled-content">{children}</p>
    </div>
  );
}

/**
 * Animates the label (above the box) and hint (below it) showing or hiding.
 * Each slot grows or collapses on its own; when one appears as the other goes,
 * the shared timing keeps their sum at 22px so the fields below never move.
 * When the hint stays up but `hintKey` changes, its new text fades in.
 * The first render is left alone so pages load still.
 */
function useFieldSlots(labelShown: boolean, hintShown: boolean, hintKey = '') {
  const labelRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const prev = useRef<{ labelShown: boolean; hintShown: boolean; hintKey: string } | null>(null);

  useGSAP(
    () => {
      const before = prev.current;
      prev.current = { labelShown, hintShown, hintKey };
      if (!before || reducedMotion()) return;

      const timing = { duration: 0.3, ease: 'power2.inOut', overwrite: true, clearProps: 'all' };
      const toggle = (slot: HTMLDivElement | null, show: boolean, y: number) => {
        if (!slot) return;
        // Heights are measured explicitly: a hiding slot already has its collapsed
        // class, so GSAP would read 'auto' as 0 and snap it shut
        if (show) {
          gsap.fromTo(slot, { height: 0 }, { height: slot.scrollHeight, ...timing });
          gsap.fromTo(
            slot.firstElementChild,
            { autoAlpha: 0, y },
            { autoAlpha: 1, y: 0, duration: 0.3, delay: 0.05, ease: 'power2.out', overwrite: true, clearProps: 'all' },
          );
        } else {
          // Held visible until the tween ends, or it would vanish at once
          const visible = { opacity: 1, visibility: 'visible' };
          gsap.fromTo(slot, { height: slot.scrollHeight, ...visible }, { height: 0, ...visible, ...timing });
          gsap.fromTo(
            slot.firstElementChild,
            { autoAlpha: 1, y: 0 },
            { autoAlpha: 0, y, duration: 0.3, ease: 'power2.out', overwrite: true, clearProps: 'all' },
          );
        }
      };

      if (before.labelShown !== labelShown) toggle(labelRef.current, labelShown, 6);
      if (before.hintShown !== hintShown) toggle(hintRef.current, hintShown, -6);
      else if (hintShown && before.hintKey !== hintKey) {
        gsap.fromTo(
          hintRef.current?.firstElementChild ?? null,
          { autoAlpha: 0, y: -4 },
          { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', overwrite: true, clearProps: 'all' },
        );
      }
    },
    { dependencies: [labelShown, hintShown, hintKey] },
  );

  return { labelRef, hintRef };
}

/** The design mixes 8px and 12px corner radii between fields. */
type Rounded = 'lg' | 'xl';
const roundedClass: Record<Rounded, string> = { lg: 'rounded-lg', xl: 'rounded-xl' };

/**
 * "md" keeps the tablet padding on mobile but scales the text (sign-up);
 * "lg" keeps the tablet size on mobile entirely (recovery flow).
 */
type Size = 'responsive' | 'md' | 'lg';
const inputBoxLarge =
  'flex cursor-text items-center gap-2.5 border border-disabled-surface p-4 transition-colors focus-within:border-primary';
const inputLarge =
  'min-w-0 flex-1 bg-transparent text-lg text-txt-black outline-none placeholder:text-disabled-content';
const boxClass: Record<Size, string> = { responsive: inputBox, md: inputBoxLarge, lg: inputBoxLarge };
const inputClass: Record<Size, string> = { responsive: input, md: input, lg: inputLarge };

type TextFieldProps = {
  icon: Icon;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint: ReactNode;
  type?: 'text' | 'email';
  autoComplete?: string;
  rounded?: Rounded;
  size?: Size;
  /** Button at the right end of the box, like the password visibility toggle */
  action?: ReactNode;
};

export function TextField({
  icon,
  label,
  name,
  value,
  onChange,
  hint,
  type = 'text',
  autoComplete,
  rounded = 'lg',
  size = 'responsive',
  action,
}: TextFieldProps) {
  const hintId = useId();
  const filled = value !== '';
  const { labelRef, hintRef } = useFieldSlots(filled, !filled);
  return (
    <div data-animate="form-item" className="flex flex-col">
      <FieldLabel ref={labelRef} shown={filled}>
        {label}
      </FieldLabel>
      <label className={`${boxClass[size]} ${roundedClass[rounded]}`}>
        <InputIcon icon={icon} />
        <span className="sr-only">{label}</span>
        <input
          className={inputClass[size]}
          type={type}
          name={name}
          autoComplete={autoComplete}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={filled ? undefined : hintId}
        />
        {action}
      </label>
      <FieldHint ref={hintRef} id={hintId} shown={!filled}>
        {hint}
      </FieldHint>
    </div>
  );
}

type FieldProps = {
  value: string;
  onChange: (value: string) => void;
  hint: string;
};

export function EmailField(props: FieldProps & Pick<TextFieldProps, 'rounded' | 'size'>) {
  return (
    <TextField
      icon={EnvelopeSimple}
      label="Alamat Email"
      name="email"
      type="email"
      autoComplete="email"
      {...props}
    />
  );
}

export function PasswordField({
  value,
  onChange,
  hint,
  autoComplete,
  label = 'Kata Sandi',
  size = 'responsive',
}: FieldProps & { autoComplete: 'current-password' | 'new-password'; label?: string; size?: Size }) {
  const hintId = useId();
  const [visible, setVisible] = useState(false);
  const filled = value !== '';
  const { labelRef, hintRef } = useFieldSlots(filled, !filled);
  return (
    <div data-animate="form-item" className="flex flex-col">
      <FieldLabel ref={labelRef} shown={filled}>
        {label}
      </FieldLabel>
      <label className={`${boxClass[size]} rounded-lg`}>
        <InputIcon icon={LockSimple} />
        <span className="sr-only">{label}</span>
        <input
          className={inputClass[size]}
          type={visible ? 'text' : 'password'}
          name="password"
          autoComplete={autoComplete}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={filled ? undefined : hintId}
        />
        <button
          type="button"
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="flex shrink-0 rounded text-disabled-content transition-colors hover:text-txt-black"
        >
          {visible ? <Eye size={18} weight="light" /> : <EyeSlash size={18} weight="light" />}
        </button>
      </label>
      <FieldHint ref={hintRef} id={hintId} shown={!filled}>
        {hint}
      </FieldHint>
    </div>
  );
}

const passwordRules = [
  { label: 'Minimal 6 karakter', test: (value: string) => value.length >= 6 },
  { label: 'Mengandung minimal 1 huruf besar (A-Z)', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Mengandung minimal 1 angka (0-9)', test: (value: string) => /[0-9]/.test(value) },
];

/** True once the password meets every rule shown by PasswordRequirements. */
export const meetsPasswordRules = (value: string) => passwordRules.every((rule) => rule.test(value));

/**
 * "Syarat Kata Sandi" checklist from the design's Pass Check component.
 * Each rule flips from the Error atom to the Success atom as the password
 * satisfies it; once all pass, the component moves from its Default state
 * (red rule line) to Success (green line).
 */
export function PasswordRequirements({ value }: { value: string }) {
  const results = passwordRules.map((rule) => ({ label: rule.label, met: rule.test(value) }));
  const success = results.every((rule) => rule.met);
  return (
    <div data-animate="form-item" data-state={success ? 'success' : 'default'} className="flex gap-1.5 pl-2">
      <span
        aria-hidden
        className={`w-px shrink-0 self-stretch rounded-full transition-colors duration-300 ${success ? 'bg-success' : 'bg-primary'}`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-mono text-[10px] leading-[15px] font-bold text-disabled-content">SYARAT KATA SANDI:</p>
        <ul aria-live="polite">
          {results.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-0.5 text-xs transition-colors duration-300 ${
                rule.met ? 'text-success-content' : 'text-error'
              }`}
            >
              {rule.met ? <CheckCircle size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
              {rule.label}
              <span className="sr-only">{rule.met ? ' (terpenuhi)' : ' (belum terpenuhi)'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  /** Replaces the hint once this option is chosen, instead of hiding it */
  description?: string;
};

/**
 * Caps an option list at 3 rows and lets it scroll past that. Measured rather
 * than fixed, since options with a description are taller than plain ones.
 */
function fitRows(list: HTMLElement, rows = 3) {
  list.style.maxHeight = '';
  const style = getComputedStyle(list);
  const columns = style.display === 'grid' ? style.gridTemplateColumns.split(' ').length : 1;
  if (list.children.length <= rows * columns) return;
  const lastVisible = list.children[rows * columns - 1];
  // Its divider (a bottom border) would double up with the list's own border
  const bottom = lastVisible.getBoundingClientRect().bottom - parseFloat(getComputedStyle(lastVisible).borderBottomWidth);
  const height = bottom - list.getBoundingClientRect().top + parseFloat(style.borderBottomWidth);
  list.style.maxHeight = `${height}px`;
}

/** Option name with its description underneath, both in the option's own colour. */
function OptionText({ option, className = '' }: { option: SelectOption; className?: string }) {
  return (
    <span className={`flex min-w-0 flex-col ${className}`}>
      <span className="truncate">{option.label}</span>
      {option.description && <span className="text-xs font-normal opacity-80">{option.description}</span>}
    </span>
  );
}

/** Sheet chips fit about 10 characters side by side; longer labels get one chip per row. */
const sheetPairsMaxLabel = 10;

/** Opens a scrollable list centred on the chosen option instead of at the top. */
function scrollToSelected(list: HTMLElement) {
  const option = list.querySelector<HTMLElement>('[aria-selected="true"]');
  if (!option) return;
  const offset = option.getBoundingClientRect().top - list.getBoundingClientRect().top;
  list.scrollTop += offset - (list.clientHeight - option.offsetHeight) / 2;
}

type DropdownFieldProps = FieldProps & {
  icon: Icon;
  label: string;
  name: string;
  options: SelectOption[];
  /** Title pill on the mobile bottom sheet */
  sheetTitle: string;
  /** Hint kept up once an option is chosen, for options without their own description */
  selectedHint?: (option: SelectOption) => string;
};

/**
 * Custom select from the design's Dropdown molecule. Tablet and up opens an
 * inline option list under the trigger; mobile opens a bottom sheet where the
 * choice is committed with "Konfirmasi Pilihan".
 */
export function DropdownField({
  icon,
  label,
  name,
  value,
  onChange,
  hint,
  options,
  sheetTitle,
  selectedHint,
}: DropdownFieldProps) {
  const hintId = useId();
  const listId = useId();
  const [open, setOpen] = useState<'list' | 'sheet' | null>(null);
  const [pending, setPending] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const selected = options.find((option) => option.value === value);
  // The open list also shows the label (the design's "Actived" state)
  const showLabel = Boolean(selected) || open === 'list';
  // A chosen option with a description keeps the hint up, now describing the choice
  const description = selected && (selected.description ?? selectedHint?.(selected));
  const showHint = !showLabel || Boolean(description);
  const { labelRef, hintRef } = useFieldSlots(showLabel, showHint, description);

  const { contextSafe } = useGSAP(
    () => {
      closing.current = false;
      // Sized before any tween moves the options, and even with reduced motion
      const sheetList = panelRef.current?.querySelector('ul');
      for (const list of [listRef.current, sheetList]) {
        if (!list) continue;
        fitRows(list);
        scrollToSelected(list);
      }
      if (reducedMotion()) return;
      gsap.to(caretRef.current, { rotation: open === 'list' ? 180 : 0, duration: 0.3, ease: 'power2.out' });

      if (open === 'list' && listRef.current) {
        gsap.fromTo(
          listRef.current,
          { autoAlpha: 0, y: -8, clipPath: 'inset(0% 0% 100% 0% round 8px)' },
          { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 8px)', duration: 0.35, ease: 'power3.out' },
        );
        gsap.fromTo(
          listRef.current.children,
          { autoAlpha: 0, y: -6 },
          { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.05, delay: 0.08, ease: 'power2.out' },
        );
      }

      if (open === 'sheet' && overlayRef.current && panelRef.current) {
        gsap.fromTo(overlayRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
        gsap.fromTo(panelRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: 'power3.out' });
        gsap.fromTo(
          panelRef.current.querySelectorAll('[data-sheet-item]'),
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 0.15, ease: 'power2.out' },
        );
      }
    },
    { dependencies: [open] },
  );

  // Sheet chip picked: pop the chip and sweep the oversized check in
  useGSAP(
    () => {
      if (!pending || reducedMotion() || !panelRef.current) return;
      const chip = panelRef.current.querySelector('[data-chip="selected"]');
      if (!chip) return;
      gsap.fromTo(chip, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
      gsap.fromTo(
        chip.querySelector('[data-chip-mark]'),
        { autoAlpha: 0, x: -24, y: -24 },
        { autoAlpha: 1, x: 0, y: 0, duration: 0.4, ease: 'power3.out' },
      );
    },
    { dependencies: [pending] },
  );

  /** Plays the exit animation, then unmounts the list or sheet. */
  const close = contextSafe((refocus: boolean = true) => {
    if (!open || closing.current) return;
    closing.current = true;
    const done = () => {
      setOpen(null);
      if (refocus) triggerRef.current?.focus();
    };
    if (reducedMotion()) return done();

    if (open === 'list') {
      gsap.to(caretRef.current, { rotation: 0, duration: 0.25, ease: 'power2.inOut' });
      gsap.to(listRef.current, {
        autoAlpha: 0,
        y: -8,
        clipPath: 'inset(0% 0% 100% 0% round 8px)',
        duration: 0.22,
        ease: 'power2.in',
        onComplete: done,
      });
    } else {
      gsap.to(panelRef.current, { yPercent: 100, duration: 0.28, ease: 'power2.in' });
      gsap.to(overlayRef.current, { autoAlpha: 0, duration: 0.28, onComplete: done });
    }
  });

  function toggle() {
    if (open) return close();
    setPending(value);
    setOpen(window.matchMedia('(min-width: 768px)').matches ? 'list' : 'sheet');
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onPointer = (e: PointerEvent) => {
      if (open === 'list' && !rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    if (open === 'sheet') document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    // Raised while open: GSAP leaves a transform on every form-item, so each one is
    // its own stacking context and later fields would otherwise paint over the list
    <div ref={rootRef} data-animate="form-item" className={`relative ${open === 'list' ? 'z-[9999]' : ''}`}>
      <div className="flex flex-col">
        <FieldLabel ref={labelRef} shown={showLabel}>
          {label}
        </FieldLabel>
        <input type="hidden" name={name} value={value} />
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open !== null}
          aria-controls={listId}
          aria-describedby={showHint ? hintId : undefined}
          onClick={toggle}
          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            open ? 'border-primary' : 'border-disabled-surface focus-visible:border-primary'
          } outline-none`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <InputIcon icon={icon} />
            <span className={`truncate text-lg ${selected ? 'text-txt-black' : 'text-disabled-content'}`}>
              {selected?.label ?? label}
            </span>
          </span>
          {/* Rotated by GSAP; flipped, it reads as the design's CaretUp */}
          <span ref={caretRef} className="flex shrink-0 text-disabled-content">
            <CaretDown size={18} weight="light" aria-hidden />
          </span>
        </button>
        <FieldHint ref={hintRef} id={hintId} shown={showHint}>
          {description ?? hint}
        </FieldHint>
      </div>

      {/* Overlays the fields below instead of pushing them down */}
      {open === 'list' && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute inset-x-0 top-full z-[9999] mt-2 flex flex-col divide-y-2 divide-disabled-surface overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-disabled-surface bg-bg-white [scrollbar-width:thin]`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={`relative flex w-full items-center justify-between py-4 pr-4 text-left text-lg drop-shadow-[0_1px_1px_rgba(12,11,16,0.06)] transition-colors ${
                    isSelected
                      ? 'bg-linear-to-r from-primary/10 to-white/0 pl-[34px] font-semibold text-primary'
                      : 'bg-bg-white pl-4 text-disabled-content hover:bg-neutral-100'
                  }`}
                >
                  {isSelected && <span aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-full bg-primary" />}
                  <OptionText option={option} />
                  {isSelected && <Check size={18} aria-hidden className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Portaled: the form's backdrop-blur would otherwise contain this fixed overlay */}
      {open === 'sheet' &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-ink-10 pt-2.5 backdrop-blur-[1.5px]"
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={sheetTitle}
              className="relative flex w-full max-w-[375px] flex-col items-center gap-8 rounded-t-lg bg-bg-white px-6 py-[42px] drop-shadow-[0_-4px_4px_rgba(12,11,16,0.1)]"
            >
              <p className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-md bg-primary px-[18px] py-1 text-md font-semibold whitespace-nowrap text-txt-white">
                {sheetTitle}
              </p>
              <div className="flex w-full flex-col gap-3">
                <ul
                  id={listId}
                  role="listbox"
                  aria-label={label}
                  className={`grid gap-3 overflow-y-auto overscroll-contain [scrollbar-width:thin] ${
                    options.every((option) => option.label.length <= sheetPairsMaxLabel) ? 'grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {options.map((option) => {
                    const isSelected = option.value === pending;
                    return (
                      <li key={option.value} data-sheet-item role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          data-chip={isSelected ? 'selected' : undefined}
                          onClick={() => setPending(option.value)}
                          className={`relative flex min-h-[60px] w-full items-center justify-between gap-3 overflow-hidden rounded-lg px-[18px] py-3 text-left text-lg transition-colors ${
                            isSelected
                              ? 'bg-primary font-semibold text-bg-white'
                              : 'border border-disabled-surface bg-txt-white text-disabled-surface'
                          }`}
                        >
                          {isSelected && (
                            <Check
                              data-chip-mark
                              aria-hidden
                              size={204}
                              className="pointer-events-none absolute top-[-101px] left-[-60px] text-txt-white mix-blend-overlay"
                            />
                          )}
                          <OptionText option={option} className="relative" />
                          {isSelected && <Check size={18} aria-hidden className="relative shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  data-sheet-item
                  disabled={!pending}
                  onClick={() => {
                    onChange(pending);
                    close();
                  }}
                  className="w-full rounded-lg bg-primary px-3 py-4 text-lg font-semibold text-bg-white transition-[background-color,filter] hover:enabled:brightness-95 disabled:cursor-not-allowed disabled:bg-primary-border disabled:text-primary-surface"
                >
                  Konfirmasi Pilihan
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function RememberRow({
  checked,
  onChange,
  boldLink = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Sign-up keeps the link semibold on mobile; login drops it to medium. */
  boldLink?: boolean;
}) {
  return (
    <div data-animate="form-item" className="flex items-start justify-between">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-50 md:text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="checkbox size-4 shrink-0 cursor-pointer appearance-none rounded border border-primary-subtle bg-white checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        Ingat saya
      </label>
      <Link
        href="/forgot-password"
        className={`text-xs text-primary hover:underline md:text-sm md:font-semibold ${
          boldLink ? 'font-semibold' : 'font-medium'
        }`}
      >
        Lupa Kata Sandi
      </Link>
    </div>
  );
}

export function SubmitButton({
  disabled,
  loading = false,
  loadingLabel = 'Memproses...',
  size = 'responsive',
  children,
}: {
  disabled: boolean;
  /** Request in flight: shows a spinner and a "please wait" note, and blocks further taps. */
  loading?: boolean;
  loadingLabel?: string;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <div data-animate="form-item" className="flex flex-col">
      <button
        type="submit"
        disabled={disabled || loading}
        aria-busy={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 font-semibold text-bg-white transition-[background-color,filter] duration-300 hover:enabled:brightness-95 ${
          // Loading keeps the full primary colour so it reads as "working", not "unavailable"
          loading ? 'cursor-wait bg-primary' : 'bg-primary disabled:cursor-not-allowed disabled:bg-primary-subtle'
        } ${size === 'lg' ? 'py-4 text-xl' : 'py-3 text-lg md:py-4 md:text-xl'}`}
      >
        {loading && <CircleNotch size={20} weight="bold" aria-hidden className="shrink-0 motion-safe:animate-spin" />}
        {loading ? loadingLabel : children}
      </button>
      {/* Stays mounted (empty, zero height) so screen readers announce the note when it appears */}
      <p role="status" className={`text-center text-xs text-ink-50 md:text-sm ${loading ? 'mt-2' : ''}`}>
        {loading && 'Mohon tunggu sebentar, tidak perlu menekan tombol lagi.'}
      </p>
    </div>
  );
}

const socialProviders = [
  { name: 'Google', icon: '/images/google.svg' },
  { name: 'Facebook', icon: '/images/facebook.svg' },
  { name: 'Apple', icon: '/images/apple.svg' },
];

/** "Atau Gunakan Opsi" divider plus the social sign-in buttons. */
// Hidden until the third-party sign-in providers are set up in Supabase
const showSocialOptions = false;

export function SocialOptions({
  mediumDivider = false,
}: {
  /** Sign-up keeps the divider label medium on mobile; login uses semibold. */
  mediumDivider?: boolean;
}) {
  if (!showSocialOptions) return null;

  return (
    <>
      <div data-animate="form-item" className="flex items-center gap-2.5">
        <Image src="/images/divider.svg" alt="" width={227} height={1} className="h-px min-w-px flex-[1_0_0]" />
        <span
          className={`shrink-0 text-center text-xs text-ink-30 md:text-sm md:font-medium ${
            mediumDivider ? 'font-medium' : 'font-semibold'
          }`}
        >
          Atau Gunakan Opsi
        </span>
        <Image src="/images/divider.svg" alt="" width={227} height={1} className="h-px min-w-px flex-[1_0_0]" />
      </div>

      <div className="flex flex-col gap-3">
        {socialProviders.map((provider) => (
          <button
            key={provider.name}
            data-animate="form-item"
            type="button"
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-300 bg-bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-xs transition-colors hover:bg-neutral-100 md:p-4 md:text-md"
          >
            <Image src={provider.icon} alt="" width={20} height={20} />
            Lanjutkan dengan {provider.name}
          </button>
        ))}
      </div>
    </>
  );
}

export function AuthFooterNote({
  prompt,
  linkLabel,
  href,
}: {
  prompt: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div data-animate="form-item" className="flex flex-col items-center gap-4 text-center text-sm text-ink-50 md:text-md">
      <p>
        {prompt}{' '}
        <Link href={href} className="text-primary hover:underline">
          {linkLabel}
        </Link>
      </p>
      <p>Dengan melanjutkan, kamu menyetujui Ketentuan Layanan dan Kebijakan Privasi Elias.</p>
    </div>
  );
}

/** Result of a submit: an error from the server, or a note such as "check your email". */
export type FormStatus = { tone: 'error' | 'success'; text: string } | null;

export function FormMessage({ status }: { status: FormStatus }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg px-4 py-3 text-sm md:text-md ${
        status.tone === 'error' ? 'bg-primary-surface text-txt-black' : 'bg-success-surface text-txt-black'
      }`}
    >
      {status.text}
    </p>
  );
}
