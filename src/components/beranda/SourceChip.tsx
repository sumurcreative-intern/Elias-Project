import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';

/** "5.000+ jumlah pencarian": the leading figure in semibold, like the Figma chips. */
export function leadFigure(text: string): ReactNode {
  const match = text.match(/^([+-]?[\d.,]+\+?)(\s.*)?$/);
  if (!match) return text;
  return (
    <>
      <strong>{match[1]}</strong>
      {match[2]}
    </>
  );
}

type SourceChipProps = {
  href: string;
  label: string;
  /** Figures under the label, one per line */
  lines: ReactNode[];
  /** Full name of what the link opens, when the label is shorter (a video's channel, not its title) */
  title?: string;
  className?: string;
};

/** A link to one source behind a trend: name, arrow, and its figures. */
export default function SourceChip({ href, label, lines, title, className = '' }: SourceChipProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`flex max-w-full flex-col items-start border border-hairline px-3 py-1.5 transition-colors hover:border-txt-black ${className}`}
    >
      <span className="flex max-w-full items-center gap-1.5 text-sm font-medium text-txt-black">
        <span className="truncate">{label}</span>
        <ArrowUpRight size={16} aria-hidden className="shrink-0" />
      </span>
      {lines.map((line, i) => (
        // Figures wrap rather than cut off, so a narrow grid column keeps all of them
        <span key={i} className="max-w-full text-xs text-pretty text-disabled-content">
          {line}
        </span>
      ))}
      <span className="sr-only">{title ? `${title} (buka di tab baru)` : '(buka di tab baru)'}</span>
    </a>
  );
}
