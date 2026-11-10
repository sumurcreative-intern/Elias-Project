'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PencilSimpleLine } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { TextField, type FormStatus, type SelectOption } from '../auth/fields';
import BackLink from './BackLink';
import OnboardingForm from './OnboardingForm';

// Keep in sync with profiles_referral_source_check
const referralSources: SelectOption[] = [
  { value: 'x_twitter', label: 'X/Twitter' },
  { value: 'friend_colleague', label: 'Teman/Rekan Kerja' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'ai_platform', label: 'ChatGPT/Claude/Platform AI Lainnya' },
  { value: 'google', label: 'Google' },
  { value: 'github', label: 'GitHub' },
  { value: 'ads', label: 'Iklan' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Lainnya/Tidak Yakin' },
];

export type SurveyAnswers = {
  referral_source: string | null;
  referral_source_other: string | null;
};

export default function SurveyForm({ initial }: { initial: SurveyAnswers | null }) {
  const router = useRouter();
  const legendId = useId();
  const [source, setSource] = useState(referralSources.find((s) => s.value === initial?.referral_source)?.value ?? '');
  const [otherSource, setOtherSource] = useState(initial?.referral_source_other ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  // The free-text answer is optional, even for "Lainnya/Tidak Yakin"
  const canSubmit = source !== '' && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: 'Sesi kamu telah berakhir. Silakan masuk lagi.' });
      return;
    }

    // Setting onboarding_completed_at makes the database check every required answer
    const { error } = await supabase
      .from('profiles')
      .update({
        referral_source: source,
        referral_source_other: source === 'other' ? otherSource.trim() || null : null,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id')
      .single();
    if (error) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    // Stays disabled while Beranda loads
    router.push('/');
  }

  return (
    <OnboardingForm
      step={3}
      back={<BackLink href="/onboarding/goals" />}
      title="Dari mana kamu pertama kali tahu tentang Elias?"
      subtitle="Jawabanmu membantu kami menjangkau lebih banyak kreator seperti kamu."
      canSubmit={canSubmit}
      submitting={submitting}
      status={status}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-1" aria-labelledby={legendId}>
        <legend id={legendId} data-animate="form-item" className="mb-1 text-xs font-medium text-disabled-content">
          Sumber
        </legend>
        {/* Same tiles as the goals step, with a radio since only one answer counts */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {referralSources.map((option) => {
            const checked = source === option.value;
            return (
              <label
                key={option.value}
                data-animate="form-item"
                className={`relative block cursor-pointer rounded-xl border py-3.5 pr-11 pl-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
                  checked ? 'border-primary bg-primary-surface/40' : 'border-disabled-surface hover:border-disabled-content'
                }`}
              >
                <input
                  type="radio"
                  name="referralSource"
                  value={option.value}
                  checked={checked}
                  onChange={() => setSource(option.value)}
                  className="absolute top-4 right-4 size-4 cursor-pointer appearance-none rounded-full border border-disabled-content bg-white outline-none checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_white]"
                />
                <span className={`block text-sm md:text-md ${checked ? 'text-txt-black' : 'text-disabled-content'}`}>
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {/* Mounted from the start so the page-load reveal un-hides it like every other
          form-item; mounting it later would leave it stuck invisible */}
      <div className={source === 'other' ? '' : 'hidden'}>
        <TextField
          icon={PencilSimpleLine}
          label="Ceritakan dari mana (opsional)"
          name="referralSourceOther"
          value={otherSource}
          onChange={(value) => setOtherSource(value.slice(0, 200))}
          hint="Misalnya nama podcast, komunitas, atau acara."
        />
      </div>
    </OnboardingForm>
  );
}
