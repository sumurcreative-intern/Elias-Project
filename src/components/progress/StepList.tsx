import { CaretRight } from '@phosphor-icons/react/ssr';
import type { Flow } from './flows';

function Rule() {
  return <div className="h-px w-full bg-txt-white/8" />;
}

/** Multi-step flow list shown inside the laptop hero panel. */
export default function StepList({ flow, current }: { flow: Flow; current: number }) {
  return (
    <div data-animate="hero-line" className="flex w-full flex-col gap-4 text-txt-white">
      <p className="font-mono text-xs">{flow.heading}</p>
      <ol className="flex w-full flex-col items-center gap-2.5">
        <li aria-hidden className="w-full">
          <Rule />
        </li>
        {flow.steps.map((step, i) => (
          <li key={step.short} className="flex w-full flex-col gap-2.5">
            {i === current ? (
              <div className="flex w-full items-center justify-between px-2" aria-current="step">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  <CaretRight size={16} weight="bold" />
                  {step.short}
                </span>
                <span className="rounded-2xl bg-primary-surface px-2 py-0.5 font-mono text-[10px] leading-[15px] text-primary">
                  POSISI KAMU SEKARANG
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <span className="text-sm">{step.short}</span>
                {i < current && (
                  <span className="rounded-2xl bg-green-50 px-2 py-0.5 font-mono text-[10px] leading-[15px] text-success">
                    Selesai
                  </span>
                )}
              </div>
            )}
            <Rule />
          </li>
        ))}
      </ol>
      <p className="text-xs">
        Progres tersimpan di setiap langkah. Semua jawaban bisa diubah nanti di Profile.
      </p>
    </div>
  );
}
