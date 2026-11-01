import type { ReactNode } from 'react';
import Logo from './Logo';

type HeroPanelProps = {
  /** Headline split into the lines it wraps to in the design */
  headline: string[];
  body: string;
  /** Gradient angle differs slightly between pages in the design */
  angle: string;
  children?: ReactNode;
};

/** Gradient brand panel — laptop and up only. */
export default function HeroPanel({ headline, body, angle, children }: HeroPanelProps) {
  return (
    <aside
      data-animate="hero"
      style={{
        backgroundImage: `linear-gradient(${angle}, #fc3c2f 1.55%, #e2335f 50.77%, #3a3961 100%)`,
      }}
      className="hidden min-w-0 flex-[1_0_0] flex-col items-start justify-between rounded-[32px] p-[52px] laptop:flex"
    >
      <Logo darkMode />
      <div className="flex w-full flex-col gap-[50px]">
        <div className="flex w-full flex-col gap-4 text-txt-white">
          <p className="text-display-3xl font-black italic">
            {headline.map((line) => (
              <span key={line} className="block overflow-hidden">
                <span data-animate="hero-line" className="block">
                  {line}
                </span>
              </span>
            ))}
          </p>
          <p data-animate="hero-line" className="text-lg">
            {body}
          </p>
        </div>
        {children}
      </div>
    </aside>
  );
}
