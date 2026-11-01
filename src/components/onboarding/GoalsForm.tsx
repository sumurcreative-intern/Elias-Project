'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarStar, Star } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { DropdownField, type FormStatus, type SelectOption } from '../auth/fields';
import BackLink from './BackLink';
import OnboardingForm from './OnboardingForm';

const goals = [
  'Meningkatkan kesadaran brand',
  'Mendorong penjualan langsung',
  'Membangun audiens/komunitas lokal',
  'Memposisikan ulang brand',
  'Meluncurkan produk atau kampanye baru',
  'Meningkatkan engangement baru',
];

// TODO: confirm the delivery times for the morning email
const notificationTimes: SelectOption[] = ['05:00', '06:00', '07:00', '08:00', '09:00'].map((time) => ({
  value: time,
  label: `${time} WIB`,
}));

export default function GoalsForm() {
  const router = useRouter();
  const hintId = useId();
  // Kept in selection order: the first pick is the top priority
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [notificationTime, setNotificationTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const canSubmit = selectedGoals.length > 0 && notificationTime !== '' && !submitting;

  function toggleGoal(goal: string) {
    setSelectedGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    );
  }

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
        goals: selectedGoals,
        notification_time: notificationTime,
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
    // Stays disabled while the dashboard loads
    router.push('/dashboard');
  }

  return (
    <OnboardingForm
      step={2}
      back={<BackLink href="/onboarding/profile" />}
      title="Tujuan & Preferensi"
      subtitle="Tujuan & preferensimu menentukan persona Elias"
      canSubmit={canSubmit}
      status={status}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col gap-1" aria-describedby={hintId}>
        <legend data-animate="form-item" className="mb-1 text-xs font-medium text-disabled-content">
          Tujuan
        </legend>
        {/* Tiles instead of checkbox rows: a star marks the top priority, a checkbox the rest */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {goals.map((goal) => {
            const rank = selectedGoals.indexOf(goal);
            const checked = rank !== -1;
            const top = rank === 0;
            return (
              <label
                key={goal}
                data-animate="form-item"
                className={`relative block cursor-pointer rounded-xl border py-3.5 pr-11 pl-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
                  top
                    ? 'border-primary bg-primary-surface/40'
                    : checked
                      ? 'border-primary-border'
                      : 'border-disabled-surface hover:border-disabled-content'
                }`}
              >
                {/* Stays the real control on the top pick too, just hidden behind the star */}
                <input
                  type="checkbox"
                  name="goals"
                  value={goal}
                  checked={checked}
                  onChange={() => toggleGoal(goal)}
                  className={
                    top
                      ? 'sr-only'
                      : 'checkbox absolute top-4 right-4 size-4 cursor-pointer appearance-none rounded border border-disabled-content bg-white outline-none checked:border-primary checked:bg-primary'
                  }
                />
                {top && (
                  <Star size={20} weight="fill" aria-hidden className="absolute top-3.5 right-3.5 text-primary" />
                )}
                {/* Deselecting the top priority promotes the next pick */}
                {top && <span className="block text-xs font-medium text-primary">Prioritas utama</span>}
                <span className={`block text-sm md:text-md ${checked ? 'text-txt-black' : 'text-disabled-content'}`}>
                  {goal}
                </span>
              </label>
            );
          })}
        </div>
        <p id={hintId} data-animate="form-item" className="text-xs text-disabled-content">
          Pilihan pertama otomatis menjadi prioritas utama, ditandai bintang.
        </p>
      </fieldset>

      <DropdownField
        icon={CalendarStar}
        label="Aktifkan Notifikasi"
        name="notificationTime"
        options={notificationTimes}
        value={notificationTime}
        onChange={setNotificationTime}
        hint="Pilih jam kamu ingin menerima email pagi dari Elias."
        // Confirms the choice in the user's terms once a time is picked
        selectedHint={(time) => `Email dari Elias tiba setiap pagi pukul ${time.label}.`}
        sheetTitle="Pilih Waktu Notifikasi"
      />
    </OnboardingForm>
  );
}
