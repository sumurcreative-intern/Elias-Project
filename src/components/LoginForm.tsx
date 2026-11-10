'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { setRememberPreference } from '@/lib/supabase/remember';
import {
  AuthFooterNote,
  EmailField,
  FormMessage,
  PasswordField,
  RememberRow,
  SocialOptions,
  SubmitButton,
  type FormStatus,
} from './auth/fields';

export default function LoginForm({ initialStatus }: { initialStatus: FormStatus }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(initialStatus);

  const canSubmit = email.trim() !== '' && password !== '' && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);

    setRememberPreference(remember);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSubmitting(false);
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    // The proxy sends users with unfinished onboarding to the step they stopped at
    router.push('/');
    // Drop any cached pages rendered while signed out, which still show Daftar/Masuk
    router.refresh();
  }

  return (
    <section className="flex min-w-0 flex-[1_0_0] items-center justify-center bg-bg-white px-6 pt-7 md:px-[62px] md:pt-20 md:pb-[52px] laptop:min-h-[880px] laptop:p-[52px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full flex-col justify-center gap-8 backdrop-blur-[4px]"
      >
        <div data-animate="form-item" className="flex flex-col gap-2.5">
          <h1 className="text-display-md font-bold">Selamat Datang Kembali!</h1>
          <p className="text-md md:text-xl">Silakan masuk ke akun Elias kamu.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <EmailField value={email} onChange={setEmail} hint="Gunakan email yang sesuai." />
          <PasswordField
            value={password}
            onChange={setPassword}
            hint="Masukkan kata sandi kamu."
            autoComplete="current-password"
          />
          <RememberRow checked={remember} onChange={setRemember} />
        </div>

        <div className="flex flex-col gap-[18px]">
          <FormMessage status={status} />
          <SubmitButton disabled={!canSubmit} loading={submitting} loadingLabel="Sedang masuk...">
            Masuk
          </SubmitButton>
          <SocialOptions />
        </div>

        <AuthFooterNote prompt="Belum punya akun Elias?" linkLabel="Daftar Sekarang" href="/signup" />
      </form>
    </section>
  );
}
