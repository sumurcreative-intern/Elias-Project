import type { FormEvent, ReactNode } from 'react';
import { FormMessage, SubmitButton, type FormStatus } from '../auth/fields';
import { onboardingFlow } from '../progress/flows';
import PhaseProgress from '../progress/PhaseProgress';

type OnboardingFormProps = {
  step: number;
  /** Top-left action: a BackLink, or a sign-out back button on the first step */
  back: ReactNode;
  title: string;
  subtitle: string;
  canSubmit: boolean;
  submitting: boolean;
  status: FormStatus;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

/** Form column shared by the onboarding steps: back link, tracker, heading, fields, submit. */
export default function OnboardingForm({
  step,
  back,
  title,
  subtitle,
  canSubmit,
  submitting,
  status,
  onSubmit,
  children,
}: OnboardingFormProps) {
  return (
    <section className="flex min-w-0 flex-[1_0_0] justify-center bg-bg-white px-6 pt-7 pb-5 md:px-[62px] md:pt-[58px] md:pb-[30px] laptop:min-h-[880px] laptop:p-[52px]">
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex w-full flex-col items-stretch gap-8 backdrop-blur-[4px]"
      >
        {back}

        {/* Laptop shows progress in the hero panel instead */}
        <div className="laptop:hidden">
          <PhaseProgress flow={onboardingFlow} current={step} />
        </div>

        <div data-animate="form-item" className="flex flex-col gap-2.5">
          <h1 className="text-display-md font-bold">{title}</h1>
          <p className="text-md md:text-xl">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-2.5">{children}</div>

        <FormMessage status={status} />
        <SubmitButton disabled={!canSubmit} loading={submitting} loadingLabel="Menyimpan...">
          Lanjutkan
        </SubmitButton>
      </form>
    </section>
  );
}
