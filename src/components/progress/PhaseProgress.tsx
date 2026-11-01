import { CheckCircle } from '@phosphor-icons/react/ssr';
import type { Flow, FlowStep } from './flows';

type Status = 'done' | 'active' | 'pending';

const badge: Record<Status, { label: string; className: string }> = {
  done: { label: 'Selesai', className: 'bg-green-50 text-success' },
  active: { label: 'Sedang Dikerjakan', className: 'bg-primary-surface text-primary' },
  pending: { label: 'Tertunda', className: 'bg-neutral-100 text-gray-600' },
};

function PhaseText({ step, index, status }: { step: FlowStep; index: number; status: Status }) {
  const pending = status === 'pending';
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex flex-col whitespace-nowrap ${pending ? 'text-ink-20' : ''}`}>
        <p className={`font-mono text-[10px] leading-[15px] ${pending ? '' : 'text-ink-40'}`}>TAHAP {index + 1}</p>
        <p className={`text-md font-semibold ${pending ? '' : 'text-txt-black'}`}>{step.title}</p>
      </div>
      <span className={`w-fit rounded-2xl px-2 py-0.5 text-xs font-medium mix-blend-multiply ${badge[status].className}`}>
        {badge[status].label}
      </span>
    </div>
  );
}

function PhaseIcon({ step, status }: { step: FlowStep; status: Status }) {
  if (status === 'done') {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-surface text-success">
        <CheckCircle size={20} />
      </span>
    );
  }
  const StepIcon = step.icon;
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
        status === 'active'
          ? 'border-6 border-primary-surface bg-primary-subtle text-primary'
          : 'bg-neutral-100 text-stone'
      }`}
    >
      <StepIcon size={20} />
    </span>
  );
}

function Connector({ status }: { status: Status }) {
  const track = { done: 'bg-success', active: 'bg-primary-surface', pending: 'bg-ink-10' }[status];
  return (
    <span className={`relative h-0.5 min-w-px flex-[1_0_0] rounded-full ${track}`}>
      {status === 'active' && (
        <span
          data-animate="progress"
          className="absolute inset-y-0 left-0 w-2/3 origin-left rounded-full bg-primary"
        />
      )}
    </span>
  );
}

type PhaseProgressProps = {
  flow: Flow;
  current: number;
  /** Mobile shows only the current phase; some flows hide it on mobile entirely. */
  showOnMobile?: boolean;
};

/**
 * Phase tracker for multi-step flows. Tablet shows every phase with icons
 * and connectors; mobile shows only the current phase.
 */
export default function PhaseProgress({ flow, current, showOnMobile = true }: PhaseProgressProps) {
  const statusOf = (i: number): Status => (i < current ? 'done' : i === current ? 'active' : 'pending');

  return (
    <div data-animate="form-item" className={showOnMobile ? '' : 'hidden md:block'}>
      {showOnMobile && (
        <div className="md:hidden">
          <PhaseText step={flow.steps[current]} index={current} status="active" />
        </div>
      )}

      <ol className="hidden w-full items-center gap-2.5 md:flex">
        {flow.steps.map((step, i) => {
          const status = statusOf(i);
          return (
            <li
              key={step.title}
              aria-current={status === 'active' ? 'step' : undefined}
              className="flex min-w-0 flex-[1_0_0] flex-col gap-3"
            >
              <div className="flex w-full items-center gap-2.5">
                <PhaseIcon step={step} status={status} />
                <Connector status={status} />
              </div>
              <PhaseText step={step} index={i} status={status} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
