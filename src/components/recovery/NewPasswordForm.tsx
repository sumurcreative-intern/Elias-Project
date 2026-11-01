'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { FormMessage, PasswordField, SubmitButton, type FormStatus } from '../auth/fields';
import { clearRecoveryEmail } from './recoveryEmail';
import RecoveryStepForm from './RecoveryStepForm';

/** Step 3 of account recovery: choose a new password. */
export default function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const canSubmit = password !== '' && !submitting;

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
      setStatus({ tone: 'error', text: 'Sesi pemulihan berakhir. Mulai lagi dari awal.' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }

    // The recovery session ends here; the user signs in with the new password
    await supabase.auth.signOut();
    clearRecoveryEmail();
    router.push('/login');
  }

  return (
    <RecoveryStepForm
      step={2}
      backHref="/forgot-password/verify"
      title="Buat Kata Sandi Baru"
      subtitle="Kata sandi baru kamu harus berbeda dari kata sandi yang digunakan sebelumnya"
      onSubmit={handleSubmit}
      actions={
        <>
          <FormMessage status={status} />
          <SubmitButton disabled={!canSubmit}>Simpan Kata Sandi Baru</SubmitButton>
        </>
      }
    >
      <PasswordField
        label="Kata Sandi Baru"
        value={password}
        onChange={setPassword}
        hint="Konfirmasi kata sandi baru"
        autoComplete="new-password"
      />
    </RecoveryStepForm>
  );
}
