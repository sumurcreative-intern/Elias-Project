'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { EmailField, FormMessage, SubmitButton, type FormStatus } from '../auth/fields';
import { saveRecoveryEmail } from './recoveryEmail';
import RecoveryStepForm from './RecoveryStepForm';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step 1 of account recovery: request a verification code by email. */
export default function RecoveryEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const canSubmit = emailPattern.test(email.trim()) && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);

    // Succeeds for unknown addresses too, so the page never reveals who has an account
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
    setSubmitting(false);

    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    saveRecoveryEmail(email.trim());
    router.push('/forgot-password/verify');
  }

  return (
    <RecoveryStepForm
      step={0}
      backHref="/login"
      backLabel="Kembali"
      title="Pulihkan Akun Kamu"
      subtitle="Masukkan alamat email terdaftar untuk menerima instruksi pemulihan"
      size="lg"
      onSubmit={handleSubmit}
      actions={
        <>
          <FormMessage status={status} />
          <SubmitButton disabled={!canSubmit} loading={submitting} loadingLabel="Mengirim kode..." size="lg">
            Kirim Kode Verifikasi
          </SubmitButton>
        </>
      }
    >
      <EmailField
        value={email}
        onChange={setEmail}
        hint="Masukkan alamat email yang terdaftar."
        rounded="xl"
        size="lg"
      />
    </RecoveryStepForm>
  );
}
