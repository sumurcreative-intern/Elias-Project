'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { FormMessage, SubmitButton, type FormStatus } from '../auth/fields';
import OtpInput from './OtpInput';
import { readRecoveryEmail } from './recoveryEmail';
import RecoveryStepForm from './RecoveryStepForm';

// The copy promises a 6-digit code; the Figma frame draws 5 boxes. Must match
// the project's email OTP length in Supabase (Authentication → Providers → Email).
const CODE_LENGTH = 6;
const RESEND_SECONDS = 59;

const missingEmail: FormStatus = {
  tone: 'error',
  text: 'Email pemulihan tidak ditemukan. Kembali dan masukkan email kamu lagi.',
};

/** Step 2 of account recovery: enter the emailed code. */
export default function VerifyCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [email, setEmail] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  useEffect(() => {
    setEmail(readRecoveryEmail());
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const canSubmit = code.every((digit) => digit !== '') && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    if (!email) {
      setStatus(missingEmail);
      return;
    }
    setSubmitting(true);
    setStatus(null);

    // A valid code signs the user in, which lets the next step change the password
    const { error } = await createClient().auth.verifyOtp({ email, token: code.join(''), type: 'recovery' });
    setSubmitting(false);

    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
      return;
    }
    router.push('/forgot-password/new-password');
  }

  async function resend() {
    if (!email) {
      setStatus(missingEmail);
      return;
    }
    setCode(Array(CODE_LENGTH).fill(''));
    setSecondsLeft(RESEND_SECONDS);
    setStatus(null);

    const { error } = await createClient().auth.resetPasswordForEmail(email);
    if (error) setStatus({ tone: 'error', text: errorMessage(error) });
  }

  return (
    <RecoveryStepForm
      step={1}
      backHref="/forgot-password"
      title="Masukan Kode Verifikasi"
      subtitle={
        <>
          Kami telah mengirimkan kode {CODE_LENGTH} digit ke email{' '}
          <em>{email ?? 'kamu'}</em>
        </>
      }
      onSubmit={handleSubmit}
      actions={
        <>
          <FormMessage status={status} />
          <SubmitButton disabled={!canSubmit}>Verifikasi Kode</SubmitButton>
          <p data-animate="form-item" className="text-center text-sm text-txt-black md:text-md" aria-live="polite">
            {secondsLeft > 0 ? (
              <>Kirim ulang kode aktif dalam {secondsLeft} detik</>
            ) : (
              <button type="button" onClick={resend} className="font-semibold text-primary hover:underline">
                Kirim ulang kode
              </button>
            )}
          </p>
        </>
      }
    >
      <OtpInput length={CODE_LENGTH} value={code} onChange={setCode} />
    </RecoveryStepForm>
  );
}
