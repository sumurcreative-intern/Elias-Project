import type { FormEvent, ReactNode } from 'react';
import BackLink from '../onboarding/BackLink';
import { recoveryFlow } from '../progress/flows';
import PhaseProgress from '../progress/PhaseProgress';

type RecoveryStepFormProps = {
  step: number;
  backHref: string;
  backLabel?: string;
  title: string;
  subtitle: ReactNode;
  /** The first step keeps tablet-sized text and controls on mobile, and hides the tracker there */
  size?: 'responsive' | 'lg';
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Fields between the heading and the actions */
  children: ReactNode;
  /** Submit button and anything under it */
  actions: ReactNode;
};

/**
 * Form column shared by the account-recovery steps. The section keeps the
 * design's fixed height, so on mobile (steps 2–3) the actions sit at its bottom.
 */
export default function RecoveryStepForm({
  step,
  backHref,
  backLabel,
  title,
  subtitle,
  size = 'responsive',
  onSubmit,
  children,
  actions,
}: RecoveryStepFormProps) {
  const large = size === 'lg';

  return (
    <section className="flex min-h-[902px] min-w-0 flex-[1_0_0] justify-center bg-bg-white px-6 pt-[58px] pb-20 md:px-[62px] md:pt-12 laptop:min-h-[784px] laptop:p-[52px]">
      <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-8 backdrop-blur-[4px]">
        <BackLink href={backHref} label={backLabel} size={size} />

        <div
          className={`flex flex-1 flex-col ${
            large ? 'gap-[84px]' : 'justify-between md:justify-start md:gap-[84px]'
          }`}
        >
          <div className="flex flex-col gap-8">
            {/* Laptop shows progress in the hero panel instead */}
            <div className="laptop:hidden">
              <PhaseProgress flow={recoveryFlow} current={step} showOnMobile={!large} />
            </div>

            <div data-animate="form-item" className="flex flex-col gap-2.5">
              <h1 className="text-display-md font-bold">{title}</h1>
              <p className={large ? 'text-xl' : 'text-md md:text-xl'}>{subtitle}</p>
            </div>

            {children}
          </div>

          <div className="flex flex-col gap-2.5">{actions}</div>
        </div>
      </form>
    </section>
  );
}
