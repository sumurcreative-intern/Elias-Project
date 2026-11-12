'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/supabase/errors';
import { REMEMBER_METADATA, setRememberPreference } from '@/lib/supabase/remember';
import {
  AuthFooterNote,
  DropdownField,
  EmailField,
  FormMessage,
  meetsPasswordRules,
  PasswordField,
  PasswordRequirements,
  RememberRow,
  SocialOptions,
  SubmitButton,
  type FormStatus,
} from '../auth/fields';
import { onboardingFlow } from '../progress/flows';
import PhaseProgress from '../progress/PhaseProgress';

// Must match profiles_account_type_check
const accountTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'brand', label: 'Brand / Bisnis' },
  { value: 'agency', label: 'Agency' },
  { value: 'studio', label: 'Studio' },
  { value: 'organization', label: 'Organisasi / Komunitas' },
];

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  const canSubmit = email.trim() !== '' && meetsPasswordRules(password) && accountType !== '' && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);

    // Covers a session started here or by a confirmation link opened in this browser;
    // the metadata copy covers a link opened anywhere else (/auth/confirm)
    setRememberPreference(remember);
    // account_type reaches public.profiles through the on_auth_user_created trigger
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { account_type: accountType, [REMEMBER_METADATA]: remember },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`,
      },
    });
    setSubmitting(false);

    if (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
    } else if (data.session) {
      router.push('/onboarding/profile');
    } else if (data.user?.identities?.length === 0) {
      // With email confirmation on, Supabase hides existing accounts behind an empty identities list
      setStatus({ tone: 'error', text: 'Email ini sudah terdaftar. Silakan masuk.' });
    } else {
      setStatus({
        tone: 'success',
        text: `Kami telah mengirim tautan konfirmasi ke ${email.trim()}. Buka tautan itu untuk melanjutkan.`,
      });
    }
  }

  return (
    <section className="flex min-w-0 flex-[1_0_0] items-center justify-center bg-bg-white px-6 pt-[43px] pb-3 md:px-[62px] md:pt-[66px] md:pb-[46px] laptop:p-[52px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full flex-col justify-center gap-8 backdrop-blur-[4px]"
      >
        {/* The laptop layout shows progress in the hero panel instead */}
        <div className="laptop:hidden">
          <PhaseProgress flow={onboardingFlow} current={0} />
        </div>

        <div data-animate="form-item" className="flex flex-col gap-2.5">
          <h1 className="text-display-md font-bold">Buat akun Elias</h1>
          <p className="text-md md:text-xl">Satu akun untuk <strong>profil brand, Arsip, dan email pagi</strong> kamu.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <EmailField value={email} onChange={setEmail} hint="Gunakan email yang sesuai." size="md" />
          <div className="flex flex-col gap-2">
            <PasswordField
              value={password}
              onChange={setPassword}
              hint="Masukkan kata sandi kamu."
              autoComplete="new-password"
              size="md"
            />
            <PasswordRequirements value={password} />
          </div>
          <DropdownField
            icon={Users}
            label="Tipe Akun"
            name="accountType"
            value={accountType}
            onChange={setAccountType}
            options={accountTypes}
            hint="Tipe akun dapat memengaruhi hasil pembaruan jangka panjang."
            sheetTitle="Pilih Tipe Akunmu"
          />
          <RememberRow checked={remember} onChange={setRemember} boldLink />
        </div>

        <div className="flex flex-col gap-[18px]">
          <FormMessage status={status} />
          <SubmitButton disabled={!canSubmit} loading={submitting} loadingLabel="Membuat akun...">
            Buat Akun
          </SubmitButton>
          <SocialOptions mediumDivider />
        </div>

        <AuthFooterNote prompt="Sudah punya akun Elias?" linkLabel="Masuk Sekarang" href="/login" />
      </form>
    </section>
  );
}
